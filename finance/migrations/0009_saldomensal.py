from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('finance', '0008_transacao_discriminacao_transacao_manual'),
    ]

    operations = [
        migrations.CreateModel(
            name='SaldoMensal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mes', models.IntegerField()),
                ('ano', models.IntegerField()),
                ('saldo_final', models.DecimalField(decimal_places=2, max_digits=10)),
                ('data_calculo', models.DateTimeField(auto_now=True)),
                ('igreja', models.ForeignKey(on_delete=models.deletion.CASCADE, to='finance.igreja')),
            ],
            options={
                'unique_together': (('igreja', 'mes', 'ano'),),
            },
        ),
    ]