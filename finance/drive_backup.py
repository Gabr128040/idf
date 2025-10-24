import io
import os
import logging
from datetime import datetime
import requests

from django.conf import settings

logger = logging.getLogger('finance')

def _get_service_account_info():
    # Path to service account JSON provided via env var
    path = os.environ.get('GOOGLE_SERVICE_ACCOUNT_FILE')
    if not path or not os.path.exists(path):
        return None
    return path

def get_drive_service():
    """Inicializa o client do Google Drive com Service Account."""
    try:
        sa_file = _get_service_account_info()
        if not sa_file:
            logger.warning('Google service account file not configurado')
            return None
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        credentials = service_account.Credentials.from_service_account_file(
            sa_file,
            scopes=['https://www.googleapis.com/auth/drive']
        )
        service = build('drive', 'v3', credentials=credentials)
        return service
    except Exception as e:
        logger.exception('Erro iniciando Drive service: %s', e)
        return None

def upload_bytes_to_drive(content_bytes, filename, mime_type='application/octet-stream', folder_id=None):
    service = get_drive_service()
    if not service:
        raise RuntimeError('Drive service não configurado')

    file_metadata = {'name': filename}
    if folder_id:
        file_metadata['parents'] = [folder_id]

    media = None
    try:
        from googleapiclient.http import MediaIoBaseUpload
        fh = io.BytesIO(content_bytes)
        media = MediaIoBaseUpload(fh, mimetype=mime_type, resumable=True)
        file = service.files().create(body=file_metadata, media_body=media, fields='id,webViewLink,webContentLink').execute()
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
        res = service.files().list(q=q, pageSize=page_size, fields='files(id,name,createdTime,webViewLink)').execute()
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
        if folder_db:
            out['db'] = backup_sqlite_db(folder_db)
    except Exception as e:
        out['db_error'] = str(e)
    try:
        out['reports'] = backup_reports(folder_reports)
    except Exception as e:
        out['reports_error'] = str(e)
    return out
