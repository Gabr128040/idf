from django.core.management.base import BaseCommand
from finance import drive_backup
import os

class Command(BaseCommand):
    help = "Roda backup para Drive (relatórios + DB)."

    def add_arguments(self, parser):
        parser.add_argument("--type", default="all", choices=["all", "db", "reports", "sqlite"], help="Tipo de backup")

    def handle(self, *args, **options):
        t = options["type"]
        folder_db = os.environ.get('DRIVE_DB_FOLDER_ID')
        folder_reports = os.environ.get('DRIVE_REPORTS_FOLDER_ID')

        try:
            if t == "db":
                res = drive_backup.backup_postgres_db(folder_id=folder_db) if folder_db else drive_backup.backup_postgres_db()
            elif t == "reports":
                res = drive_backup.backup_reports(folder_id=folder_reports)
            elif t == "sqlite":
                res = drive_backup.backup_sqlite_db(folder_id=folder_db)
            else:
                res = drive_backup.backup_all(folder_db=folder_db, folder_reports=folder_reports)

            self.stdout.write(self.style.SUCCESS(f"Backup executado (type={t}): {res}"))
        except Exception as e:
            self.stderr.write(str(e))
            raise
