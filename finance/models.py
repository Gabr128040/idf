from django.db import models

class Transacao(models.Model):
    TIPO_CHOICES = [
        ('D', 'Dízimo'),
        ('O', 'Oferta'),
        ('S', 'Despesa'),
    ]

    CULTO_CHOICES = [
        ('CV', 'Culto da Vitória'),
        ('EBD', 'EBD'),
        ('GR', 'Gratidão'),
        ('LR', 'Lar'),
        ('FM', 'Família'),
        ('DP', 'Departamento'),
        ('OT', 'Outro'),
    ]

    TIPO_DESPESA_CHOICES = [
        ('CT', 'Conta'),
        ('IN', 'Insumo'),
        ('OT', 'Outro'),
    ]

    tipo = models.CharField(max_length=1, choices=TIPO_CHOICES)
    quantia = models.DecimalField(max_digits=10, decimal_places=2)
    data = models.DateField()
    descricao = models.TextField(blank=True, null=True)
    nome = models.CharField(max_length=100, blank=True, null=True)  # Para dízimos
    culto = models.CharField(max_length=3, choices=CULTO_CHOICES, blank=True, null=True)  # Para ofertas
    tipo_despesa = models.CharField(max_length=2, choices=TIPO_DESPESA_CHOICES, blank=True, null=True)  # Para despesas
    mes = models.IntegerField(default=1)  # Valor padrão para mês (ex: janeiro)
    ano = models.IntegerField(default=2025)  # Valor padrão para ano campo
    
    class Meta:
        db_table = 'transacoes'  # Nome da tabela no banco de dados

    def save(self, *args, **kwargs):
        # Preenche os campos mes e ano automaticamente ao salvar
        self.mes = self.data.month
        self.ano = self.data.year
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.quantia}"
    

from cloudinary_storage.storage import MediaCloudinaryStorage
from django.db import models

class Relatorio(models.Model):
    nome = models.CharField(max_length=255)  # Nome do arquivo
    mes = models.IntegerField()  # Mês do relatório
    ano = models.IntegerField()  # Ano do relatório
    data_geracao = models.DateTimeField(auto_now_add=True)  # Data de geração
    arquivo = models.FileField(storage=MediaCloudinaryStorage(), upload_to='relatorios/')  # Salvar no Cloudinary

    def __str__(self):
        return f"{self.nome} ({self.mes}/{self.ano})"
      