from django.contrib import admin
from .models import Igreja, Transacao, Relatorio, Profile

# Register your models here.

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'igreja')
    search_fields = ('user__username', 'igreja__nome')

@admin.register(Transacao)
class TransacaoAdmin(admin.ModelAdmin):
    list_display = ('id', 'tipo', 'quantia', 'data', 'discriminacao', 'manual', 'igreja')
    list_filter = ('tipo', 'manual', 'igreja')
    search_fields = ('discriminacao', 'descricao', 'nome')
