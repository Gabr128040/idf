from django.urls import path
from .views import TransacaoListCreateView, TransacaoRetrieveUpdateDestroyView
from .views import user_register, user_login, calcular_saldo


urlpatterns = [
  path('transacoes/', TransacaoListCreateView.as_view(), name='transacao-list-create'),
  path('transacoes/<int:pk>/', TransacaoRetrieveUpdateDestroyView.as_view(), name='transacao-detail'),
  path('register/', user_register, name='register'),
  path('login/', user_login, name='login'),
  path('saldo/', calcular_saldo, name='calcular_saldo'),
]