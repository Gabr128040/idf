from django.contrib import admin
from .models import Igreja, Transacao, Relatorio, Profile

# Register your models here.

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'igreja')
    search_fields = ('user__username', 'igreja__nome')
