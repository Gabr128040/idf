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
)

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

    # Saldo
    path('saldo/', calcular_saldo, name='calcular_saldo'),
]