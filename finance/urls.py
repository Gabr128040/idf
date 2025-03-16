from django.urls import path
from .views import TransacaoListCreateView, TransacaoRetrieveUpdateDestroyView

urlpatterns = [
   path('transacoes/', TransacaoListCreateView.as_view(), name='transacao-list-create'),
   path('transacoes/<int:pk>/', TransacaoRetrieveUpdateDestroyView.as_view(), name='transacao-detail'),
]