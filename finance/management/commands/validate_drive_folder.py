import os
import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger('finance')


class Command(BaseCommand):
    help = 'Valida o DRIVE_BACKUP_FOLDER_ID configurado: tenta recuperar metadados e listar arquivos.'

    def add_arguments(self, parser):
        parser.add_argument('--folder', '-f', help='Folder ID para validar (opcional). Se ausente, usa DRIVE_BACKUP_FOLDER_ID do ambiente.')

    def handle(self, *args, **options):
        folder = options.get('folder') or os.environ.get('DRIVE_BACKUP_FOLDER_ID')
        if not folder:
            self.stdout.write(self.style.ERROR('Nenhum folder id fornecido e DRIVE_BACKUP_FOLDER_ID não está definido.'))
            return

        from finance.drive_backup import get_drive_service, list_files_in_folder
        service = get_drive_service()
        if not service:
            self.stdout.write(self.style.ERROR('Drive service não configurado (check token/client secret).'))
            return

        self.stdout.write(self.style.NOTICE(f'Validando folder id: {folder}'))

        try:
            # Tenta obter metadados do file/folder
            # Note: algumas versões do client não aceitam supportsAllDrives em execute();
            # por compatibilidade, chamamos sem esse argumento.
            meta = service.files().get(fileId=folder, fields='id,name,mimeType,driveId,owners').execute()
            self.stdout.write(self.style.SUCCESS('Metadados obtidos com sucesso:'))
            for k, v in meta.items():
                self.stdout.write(f'  {k}: {v}')

            # Indica se é uma pasta
            if meta.get('mimeType') == 'application/vnd.google-apps.folder':
                self.stdout.write(self.style.SUCCESS('Este ID corresponde a uma pasta.'))
            else:
                self.stdout.write(self.style.WARNING('Este ID NÃO parece ser uma pasta (mimeType != folder).'))

        except Exception as e:
            # Tenta identificar HttpError para fornecer dicas
            try:
                from googleapiclient.errors import HttpError
                if isinstance(e, HttpError):
                    content = getattr(e, 'content', b'')
                    try:
                        msg = content.decode('utf-8') if isinstance(content, (bytes, bytearray)) else str(content)
                    except Exception:
                        msg = str(content)
                    self.stdout.write(self.style.ERROR(f'HttpError ao obter metadados: {msg}'))
                    if 'Shared drive not found' in msg:
                        self.stdout.write(self.style.ERROR('Parece ser um Shared Drive ID desconhecido. Se for Shared Drive, garanta que a conta de serviço seja membro do Shared Drive.'))
                    elif 'File not found' in msg:
                        self.stdout.write(self.style.ERROR('Arquivo/pasta não encontrado. Verifique se o ID está correto e se pertence ao usuário/conta usada para autenticar.'))
                    elif 'Insufficient Permission' in msg or 'permission denied' in msg.lower():
                        self.stdout.write(self.style.ERROR('Permissão insuficiente. Verifique se a conta (service account / token) tem acesso à pasta.'))
                else:
                    self.stdout.write(self.style.ERROR(f'Erro obtendo metadados: {e}'))
            except Exception:
                self.stdout.write(self.style.ERROR(f'Erro obtendo metadados: {e}'))

        # Tenta listar alguns arquivos na pasta (usa a função existente que possui fallback)
        try:
            files = list_files_in_folder(folder, page_size=5)
            if not files:
                self.stdout.write(self.style.WARNING('Nenhum arquivo listado (vazio ou sem acesso).'))
            else:
                self.stdout.write(self.style.SUCCESS('Arquivos listados (até 5):'))
                for f in files:
                    self.stdout.write(f"  - {f.get('name')} (id: {f.get('id')}) - {f.get('createdTime')}")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erro ao listar arquivos: {e}'))
