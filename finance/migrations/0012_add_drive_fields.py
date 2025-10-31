from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('finance', '0011_delete_saldomensal'),
    ]

    operations = [
        migrations.AddField(
            model_name='relatorio',
            name='drive_id',
            field=models.CharField(max_length=255, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='relatorio',
            name='drive_url',
            field=models.URLField(null=True, blank=True),
        ),
    ]