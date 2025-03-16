from django.shortcuts import render


from rest_framework import generics
from .models import Transacao
from .serializers import TransacaoSerializer

class TransacaoListCreateView(generics.ListCreateAPIView):
   queryset = Transacao.objects.all()
   serializer_class = TransacaoSerializer

class TransacaoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
   queryset = Transacao.objects.all()
   serializer_class = TransacaoSerializer
# Create your views here.
