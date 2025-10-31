from django.db import models
from django.contrib.auth.models import User
from cloudinary_storage.storage import MediaCloudinaryStorage

class Igreja(models.Model):
    nome = models.CharField(max_length=255)
    lider = models.CharField(max_length=255)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nome

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    igreja = models.ForeignKey(Igreja, on_delete=models.CASCADE, related_name='usuarios')

    def __str__(self):
        return f"{self.user.username} - {self.igreja.nome}"

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
    igreja = models.ForeignKey('Igreja', on_delete=models.CASCADE, related_name='transacoes', null=True, blank=True)
    manual = models.BooleanField(default=False, help_text='Transação preenchida manualmente pelo PDF interativo')
    discriminacao = models.CharField(max_length=255, blank=True, null=True, help_text='Discriminação digitada no PDF interativo')
    
    class Meta:
        db_table = 'transacoes'  # Nome da tabela no banco de dados

    def save(self, *args, **kwargs):
        # Preenche os campos mes e ano automaticamente ao salvar
        self.mes = self.data.month
        self.ano = self.data.year
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.quantia}"
    

class Relatorio(models.Model):
    nome = models.CharField(max_length=255)  # Nome do arquivo
    mes = models.IntegerField()  # Mês do relatório
    ano = models.IntegerField()  # Ano do relatório
    data_geracao = models.DateTimeField(auto_now_add=True)  # Data de geração
    arquivo = models.FileField(storage=MediaCloudinaryStorage(), upload_to='relatorios/', null=True, blank=True)  # Legacy
    drive_id = models.CharField(max_length=255, null=True, blank=True)  # ID do arquivo no Drive
    drive_url = models.URLField(null=True, blank=True)  # URL do arquivo no Drive
    igreja = models.ForeignKey('Igreja', on_delete=models.CASCADE, related_name='relatorios', null=True, blank=True)

    def __str__(self):
        return f"{self.nome} ({self.mes}/{self.ano})"


