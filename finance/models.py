from django.db import models

class Transacao(models.Model):
   TIPO_CHOICES = [
       ('D', 'Dizimo'),
       ('O', 'Oferta'),
       ('S', 'Despesa'),
   ]
   tipo = models.CharField(max_length=1, choices=TIPO_CHOICES)
   valor = models.DecimalField(max_digits=10, decimal_places=2)
   descricao = models.TextField(blank=True, null=True)
   data = models.DateField(auto_now_add=True)

   def __str__(self):
       return f"{self.get_tipo_display()} - {self.valor}"