from django.urls import path
from .views import TransacaoListCreateView, TransacaoRetrieveUpdateDestroyView
from .views import user_register, user_login, calcular_saldo
from .views import editar_transacao, deletar_transacao

urlpatterns = [
  path('transacoes/', TransacaoListCreateView.as_view(), name='transacao-list-create'),
  path('transacoes/<int:pk>/', TransacaoRetrieveUpdateDestroyView.as_view(), name='transacao-detail'),
  path('register/', user_register, name='register'),
  path('login/', user_login, name='login'),
  path('saldo/', calcular_saldo, name='calcular_saldo'),
  path('transacoes/<int:id>/editar/', editar_transacao, name='editar_transacao'),
  path('transacoes/<int:id>/deletar/', deletar_transacao, name='deletar_transacao'),
]
