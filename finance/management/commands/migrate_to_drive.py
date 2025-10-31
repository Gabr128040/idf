from django.core.management.base import BaseCommand
from django.db import transaction
import requests
from finance.models import Relatorio
from finance.drive_backup import upload_bytes_to_drive
import os
import time

class Command(BaseCommand):
    help = 'Migra relatórios do Cloudinary para o Google Drive'

    def handle(self, *args, **options):
        # Verifica configuração do Drive
        folder_id = os.environ.get('DRIVE_REPORTS_FOLDER_ID')
        if not folder_id:
            self.stdout.write(self.style.ERROR('DRIVE_REPORTS_FOLDER_ID não configurado'))
            return
            
        # Lista relatórios a migrar
        relatorios = Relatorio.objects.filter(arquivo__isnull=False, drive_id__isnull=True)
        total = relatorios.count()
        self.stdout.write(f'Migrando {total} relatórios...')
        
        migrados = 0
        erros = 0
        
        for r in relatorios:
            try:
                self.stdout.write(f'Migrando relatório {r.id} ({r.mes}/{r.ano})...')
                
                # Pega URL do Cloudinary
                url = r.arquivo.url
                if not url:
                    self.stdout.write(self.style.WARNING(f'Relatório {r.id} sem URL'))
                    continue
                    
                # Baixa do Cloudinary
                resp = requests.get(url, timeout=30)
                if resp.status_code != 200:
                    self.stdout.write(self.style.ERROR(f'Erro baixando relatório {r.id}: {resp.status_code}'))
                    continue
                
                # Nome do arquivo no Drive    
                filename = f"relatorio-{r.igreja.id if r.igreja else 'na'}-{r.mes}-{r.ano}.pdf"
                
                # Upload para o Drive
                file = upload_bytes_to_drive(
                    resp.content, 
                    filename,
                    mime_type='application/pdf',
                    folder_id=folder_id
                )
                
                # Atualiza o registro
                with transaction.atomic():
                    r.drive_id = file['id']
                    r.drive_url = file['webViewLink']
                    r.save()
                
                migrados += 1
                self.stdout.write(self.style.SUCCESS(f'Migrado: {filename}'))
                
                # Pequena pausa para não sobrecarregar as APIs
                time.sleep(1)
                
            except Exception as e:
                erros += 1
                self.stdout.write(self.style.ERROR(f'Erro ao migrar {r.id}: {str(e)}'))
        
        # Relatório final
        self.stdout.write('\nMigração concluída:')
        self.stdout.write(f'Total: {total}')
        self.stdout.write(self.style.SUCCESS(f'Migrados com sucesso: {migrados}'))
        if erros:
            self.stdout.write(self.style.ERROR(f'Erros: {erros}'))