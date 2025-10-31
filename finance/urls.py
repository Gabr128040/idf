# finance/urls.py
from django.urls import path
from .views import (
    TransacaoListCreateView,
    TransacaoRetrieveUpdateDestroyView,
    user_register,
    user_login,
    calcular_saldo,
    editar_transacao,
    deletar_transacao,
    listar_transacoes,
    RelatorioListView,
    SalvarRelatorioView,
    DeletarRelatorioView,
    IgrejaListCreateView, IgrejaRetrieveUpdateDestroyView,
    TransacoesPorIgrejaView, RelatoriosPorIgrejaView,
    me,  # Importando a view me
    estatisticas_transacoes,  # Nova view de estatísticas
    verificar_saude_sistema,  # Views de monitoramento
    verificar_status_backup,  # Views de monitoramento
    check_db_status,  # Novo endpoint detalhado de status
)
from . import views as views_module

urlpatterns = [
    # CRUD de Transações
    path('transacoes/', listar_transacoes, name='listar_transacoes'),  # Lista com filtros personalizados
    path('transacoes/nova/', TransacaoListCreateView.as_view(), name='transacao-create'),  # Criação separada
    path('transacoes/<int:pk>/', TransacaoRetrieveUpdateDestroyView.as_view(), name='transacao-detail'),  # Detalhe
    path('transacoes/<int:id>/editar/', editar_transacao, name='editar_transacao'),  # Edição
    path('transacoes/<int:id>/deletar/', deletar_transacao, name='deletar_transacao'),  # Deleção

    # Autenticação
    path('register/', user_register, name='register'),
    path('login/', user_login, name='login'),

    # Estatísticas
    path('transacoes/estatisticas/', estatisticas_transacoes, name='estatisticas-transacoes'),
    #relatorios
    path('relatorios/', RelatorioListView.as_view(), name='relatorios-list'),
    path('relatorios/salvar/', SalvarRelatorioView.as_view(), name='salvar-relatorio'),
    path('relatorios/<int:relatorio_id>/deletar/', DeletarRelatorioView.as_view(), name='deletar-relatorio'),

    # Igrejas
    path('igrejas/', IgrejaListCreateView.as_view(), name='igreja-list-create'),
    path('igrejas/<int:pk>/', IgrejaRetrieveUpdateDestroyView.as_view(), name='igreja-detail'),

    # Transações e relatórios por igreja
    path('igrejas/<int:igreja_id>/transacoes/', TransacoesPorIgrejaView.as_view(), name='transacoes-por-igreja'),
    path('igrejas/<int:igreja_id>/relatorios/', RelatoriosPorIgrejaView.as_view(), name='relatorios-por-igreja'),

    # Perfil do usuário
    path('me/', me, name='me'),
    path('api/me/', me, name='me-api'),  # Endpoint para o perfil do usuário autenticado

    # Monitoramento do sistema
    path('health/', verificar_saude_sistema, name='health-check'),
    path('check-db-status/', check_db_status, name='check-db-status'),
    path('backup/status/', verificar_status_backup, name='backup-status'),
    path('backup/run/', views_module.run_backup, name='backup-run'),
    path('backup/list/', views_module.list_backups, name='backup-list'),
    
    # Saldo
    path('saldo/', calcular_saldo, name='calcular-saldo'),
]