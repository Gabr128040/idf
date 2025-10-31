import io
import os
import logging
from datetime import datetime
import requests
import subprocess
import tempfile
import pickle
import shutil

from django.conf import settings

logger = logging.getLogger('finance')

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# Escopo para permitir criação de arquivos no Drive do usuário
SCOPES = ['https://www.googleapis.com/auth/drive.file']


def get_drive_service():
    """Inicializa o client do Google Drive com OAuth2.

    Usa `client_secret.json` em `backend/finance/` e salva o token em `token.pickle`.
    """
    try:
        creds = None
        # local token path (repo), env override, or Render secret path
        token_path_candidates = [
            os.environ.get('TOKEN_PICKLE_PATH'),
            os.path.join(os.path.dirname(__file__), 'token.pickle'),
            '/etc/secrets/token.pickle'
        ]
        token_path = None
        for p in token_path_candidates:
            if not p:
                continue
            try:
                if os.path.exists(p):
                    token_path = p
                    break
            except Exception:
                continue

        if token_path:
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)

        if not creds or not getattr(creds, 'valid', False):
            if creds and getattr(creds, 'expired', False) and getattr(creds, 'refresh_token', None):
                creds.refresh(Request())
            else:
                # client_secret path: env override, repo, or Render secret
                client_secret_candidates = [
                    os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET_PATH'),
                    os.path.join(os.path.dirname(__file__), 'client_secret.json'),
                    '/etc/secrets/client_secret.json',
                ]
                client_secret_file = None
                for p in client_secret_candidates:
                    if p and os.path.exists(p):
                        client_secret_file = p
                        break
                if not client_secret_file:
                    logger.error('client_secret.json não encontrado nas opções: %s', client_secret_candidates)
                    return None

                flow = InstalledAppFlow.from_client_secrets_file(client_secret_file, SCOPES)
                # NOTE: in production this will fail if interactive OAuth is required.
                creds = flow.run_local_server(port=0)

            # Salva as credenciais para o próximo run
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)

        from googleapiclient.discovery import build
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        logger.exception('Erro iniciando Drive service: %s', e)
        return None

def upload_bytes_to_drive(content_bytes, filename, mime_type='application/octet-stream', folder_id=None):
    service = get_drive_service()
    if not service:
        raise RuntimeError('Drive service não configurado')

    file_metadata = {
        'name': filename,
        'driveId': os.environ.get('DRIVE_BACKUP_FOLDER_ID'),  # ID do Shared Drive
    }
    if folder_id:
        file_metadata['parents'] = [folder_id]

    media = None
    try:
        from googleapiclient.http import MediaIoBaseUpload
        fh = io.BytesIO(content_bytes)
        media = MediaIoBaseUpload(fh, mimetype=mime_type, resumable=True)
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,webViewLink,webContentLink',
            supportsAllDrives=True,  # Habilita suporte a Shared Drives
            ).execute()
        return file
    except Exception as e:
        logger.exception('Erro ao enviar arquivo ao Drive: %s', e)
        raise

def list_files_in_folder(folder_id, page_size=20):
    service = get_drive_service()
    if not service:
        return []
    try:
        q = f"'{folder_id}' in parents and trashed = false"
        res = service.files().list(
            q=q,
            pageSize=page_size,
            fields='files(id,name,createdTime,webViewLink)',
            supportsAllDrives=True,  # Habilita suporte a Shared Drives
            includeItemsFromAllDrives=True,  # Inclui arquivos de Shared Drives
            corpora='drive',  # Pesquisa em Drives compartilhados
            driveId=os.environ.get('DRIVE_BACKUP_FOLDER_ID'),  # ID do Shared Drive
            ).execute()
        return res.get('files', [])
    except Exception as e:
        logger.exception('Erro listando arquivos no Drive: %s', e)
        return []

def backup_sqlite_db(folder_id=None):
    """Fazer backup do arquivo sqlite (db.sqlite3) para Drive."""
    db_path = os.path.join(settings.BASE_DIR, 'db.sqlite3')
    if not os.path.exists(db_path):
        raise FileNotFoundError('db.sqlite3 não encontrado')
    with open(db_path, 'rb') as f:
        content = f.read()
    filename = f'db-backup-{datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")}.sqlite3'
    return upload_bytes_to_drive(content, filename, mime_type='application/x-sqlite3', folder_id=folder_id)


def backup_postgres_db(folder_id=None):
    """Fazer dump do banco PostgreSQL (Supabase) e enviar ao Drive.

    Requer que o binário `pg_dump` esteja disponível no PATH do servidor.
    """
    db = settings.DATABASES.get('default', {})
    engine = db.get('ENGINE', '')
    if 'postgresql' not in engine and 'postgres' not in engine:
        raise RuntimeError('Banco não é PostgreSQL')

    name = db.get('NAME')
    user = db.get('USER')
    password = db.get('PASSWORD')
    host = db.get('HOST') or 'localhost'
    port = db.get('PORT') or '5432'

    tmp = None
    try:
        # Cria arquivo temporário para o dump
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.dump')
        tmp.close()
        dump_path = tmp.name

        env = os.environ.copy()
        if password:
            env['PGPASSWORD'] = str(password)

        cmd = [
            'pg_dump',
            '-h', host,
            '-p', str(port),
            '-U', user,
            '-F', 'c',  # formato custom
            '-b',
            '-f', dump_path,
            name
        ]

        # Executa pg_dump
        try:
            subprocess.run(cmd, check=True, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except FileNotFoundError:
            # Fallback: se pg_dump não existir, exporta dados via psycopg2 para CSVs e zipa
            logger.warning('pg_dump não encontrado — usando fallback via psycopg2 (CSV + zip)')
            try:
                return _backup_postgres_fallback_csv_zip(db, folder_id)
            except Exception as e:
                logger.exception('Fallback também falhou: %s', e)
                raise RuntimeError('pg_dump não encontrado e fallback falhou: %s' % e)

        # Lê o arquivo gerado e envia ao Drive
        with open(dump_path, 'rb') as f:
            content = f.read()

        filename = f'pg-backup-{datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")}.dump'
        return upload_bytes_to_drive(content, filename, mime_type='application/octet-stream', folder_id=folder_id)
    except Exception as e:
        logger.exception('Erro gerando backup Postgres: %s', e)
        raise
    finally:
        if tmp and os.path.exists(tmp.name):
            try:
                os.remove(tmp.name)
            except Exception:
                pass


def _backup_postgres_fallback_csv_zip(db_config, folder_id=None):
    """Fallback quando pg_dump não estiver disponível.
    Exporta cada tabela do schema public para CSV, gera metadata.json e empacota em zip.
    """
    try:
        import psycopg2
        import json
        import zipfile
    except Exception as e:
        logger.exception('Módulos necessários para fallback não disponíveis: %s', e)
        raise

    name = db_config.get('NAME')
    user = db_config.get('USER')
    password = db_config.get('PASSWORD')
    host = db_config.get('HOST') or 'localhost'
    port = db_config.get('PORT') or '5432'

    tmpdir = tempfile.mkdtemp()
    zip_path = os.path.join(tmpdir, 'pg_fallback_backup.zip')

    conn = None
    try:
        conn = psycopg2.connect(dbname=name, user=user, password=password, host=host, port=port)
        cur = conn.cursor()

        # lista tabelas do schema public
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type='BASE TABLE'
        """)
        tables = [row[0] for row in cur.fetchall()]

        metadata = {'tables': {}}

        for t in tables:
            csv_file = os.path.join(tmpdir, f"{t}.csv")
            with open(csv_file, 'w', encoding='utf-8') as f:
                # usa COPY TO STDOUT para performance
                try:
                    sql = f"COPY (SELECT * FROM public.\"{t}\") TO STDOUT WITH CSV HEADER"
                    cur.copy_expert(sql, f)
                except Exception as e:
                    logger.exception('Falha exportando tabela %s: %s', t, e)
                    # escreve mensagem de erro no csv
                    f.write('"__EXPORT_ERROR__","%s"\n' % str(e).replace('"', '""'))

            # pega colunas e tipos básicos
            cur.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema='public' AND table_name=%s
                ORDER BY ordinal_position
            """, (t,))
            cols = [{'name': r[0], 'type': r[1]} for r in cur.fetchall()]
            metadata['tables'][t] = {'columns': cols}

        # escreve metadata
        meta_path = os.path.join(tmpdir, 'metadata.json')
        with open(meta_path, 'w', encoding='utf-8') as mf:
            json.dump(metadata, mf, ensure_ascii=False, indent=2)

        # cria zip
        with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
            zf.write(meta_path, arcname='metadata.json')
            for t in tables:
                csv_file = os.path.join(tmpdir, f"{t}.csv")
                if os.path.exists(csv_file):
                    zf.write(csv_file, arcname=os.path.basename(csv_file))

        # envia para drive
        with open(zip_path, 'rb') as f:
            content = f.read()
        filename = f'pg-backup-fallback-{datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")}.zip'
        return upload_bytes_to_drive(content, filename, mime_type='application/zip', folder_id=folder_id)
    finally:
        try:
            if conn:
                conn.close()
        except Exception:
            pass
        try:
            shutil.rmtree(tmpdir)
        except Exception:
            pass

def backup_reports(folder_id=None):
    """Baixa arquivos de Relatorio.arquivo (Cloudinary URL) e envia ao Drive.
    Retorna lista de resultados.
    """
    from .models import Relatorio
    results = []
    relatorios = Relatorio.objects.all().order_by('-data_geracao')[:50]
    for r in relatorios:
        try:
            url = r.arquivo.url
            if not url:
                continue
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                ext = 'pdf'
                filename = f"relatorio-{r.igreja.id if r.igreja else 'na' }-{r.mes}-{r.ano}-{r.id}.{ext}"
                file = upload_bytes_to_drive(resp.content, filename, mime_type='application/pdf', folder_id=folder_id)
                results.append({'relatorio_id': r.id, 'drive': file})
        except Exception as e:
            logger.exception('Erro backup relatorio id %s: %s', getattr(r, 'id', None), e)
    return results

def backup_all(folder_db=None, folder_reports=None):
    out = {'db': None, 'reports': []}
    try:
        # Se banco for Postgres, usar pg_dump; senão tentar sqlite
        try:
            engine = settings.DATABASES.get('default', {}).get('ENGINE', '')
        except Exception:
            engine = ''

        if folder_db:
            if 'postgres' in engine or 'postgresql' in engine:
                out['db'] = backup_postgres_db(folder_db)
            else:
                out['db'] = backup_sqlite_db(folder_db)
    except Exception as e:
        out['db_error'] = str(e)
    try:
        out['reports'] = backup_reports(folder_reports)
    except Exception as e:
        out['reports_error'] = str(e)
    return out
