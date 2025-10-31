import os
import io
import pickle
import logging
from datetime import datetime
import requests
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# Se você estiver rodando localmente, isso evita erro de SSL
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

logger = logging.getLogger('finance')

# Se modifica isso, delete o arquivo token.pickle para reautenticar
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_drive_service():
    """Inicializa o cliente do Google Drive com OAuth2."""
    creds = None
    # Tenta carregar credenciais do arquivo token.pickle
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
    
    # Se não há credenciais válidas, precisamos autenticar
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Carrega credenciais do client_secret.json (procurando em várias localizações)
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

            flow = InstalledAppFlow.from_client_secrets_file(
                client_secret_file, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # Salva as credenciais para o próximo run (se token_path identificado)
        if token_path:
            try:
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
            except Exception:
                # se não for possível gravar no caminho (ex: /etc/secrets é somente leitura), apenas logue
                logger.warning('Não foi possível gravar token.pickle em %s; salve manualmente se necessário', token_path)

    try:
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        logger.exception('Erro iniciando Drive service: %s', e)
        return None

def upload_bytes_to_drive(content_bytes, filename, mime_type='application/octet-stream', folder_id=None):
    """Upload de arquivo para o Google Drive."""
    service = get_drive_service()
    if not service:
        raise RuntimeError('Drive service não configurado')

    file_metadata = {'name': filename}
    if folder_id:
        file_metadata['parents'] = [folder_id]

    try:
        fh = io.BytesIO(content_bytes)
        media = MediaIoBaseUpload(fh, mimetype=mime_type, resumable=True)
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id,webViewLink,webContentLink'
        ).execute()
        return file
    except Exception as e:
        logger.exception('Erro ao enviar arquivo ao Drive: %s', e)
        raise

def list_files_in_folder(folder_id, page_size=20):
    """Lista arquivos em uma pasta do Drive."""
    service = get_drive_service()
    if not service:
        return []
    try:
        q = f"'{folder_id}' in parents and trashed = false"
        res = service.files().list(
            q=q,
            pageSize=page_size,
            fields='files(id,name,createdTime,webViewLink)'
        ).execute()
        return res.get('files', [])
    except Exception as e:
        logger.exception('Erro listando arquivos no Drive: %s', e)
        return []

def backup_reports(folder_id=None):
    """Baixa arquivos de Relatorio.arquivo (Cloudinary URL) e envia ao Drive."""
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
                filename = f"relatorio-{r.igreja.id if r.igreja else 'na'}-{r.mes}-{r.ano}-{r.id}.{ext}"
                file = upload_bytes_to_drive(
                    resp.content,
                    filename,
                    mime_type='application/pdf',
                    folder_id=folder_id
                )
                results.append({'relatorio_id': r.id, 'drive': file})
        except Exception as e:
            logger.exception('Erro backup relatorio id %s: %s', getattr(r, 'id', None), e)
    return results