from django.shortcuts import render
from django.db import models

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

from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

@api_view(['POST'])
def user_register(request):
   username = request.data.get('username')
   password = request.data.get('password')
   email = request.data.get('email')

   if User.objects.filter(username=username).exists():
       return Response({'error': 'Usuário já existe'}, status=status.HTTP_400_BAD_REQUEST)

   user = User.objects.create_user(username=username, password=password, email=email)
   refresh = RefreshToken.for_user(user)
   return Response({
       'refresh': str(refresh),
       'access': str(refresh.access_token),
   }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
def user_login(request):
   username = request.data.get('username')
   password = request.data.get('password')
   user = User.objects.filter(username=username).first()

   if user and user.check_password(password):
       refresh = RefreshToken.for_user(user)
       return Response({
           'refresh': str(refresh),
           'access': str(refresh.access_token),
       }, status=status.HTTP_200_OK)

   return Response({'error': 'Credenciais inválidas'}, status=status.HTTP_400_BAD_REQUEST)
   
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Transacao

# views.py
from django.db.models import Sum
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Transacao

@api_view(['GET'])
def calcular_saldo(request):
   # Soma dos dízimos e ofertas
   total_entradas = Transacao.objects.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
   
   # Soma das despesas
   total_despesas = Transacao.objects.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
   
   # Saldo = Entradas - Despesas
   saldo = total_entradas - total_despesas
   
   return Response({'saldo': saldo})
    
@api_view(['DELETE'])
def deletar_transacao(request, id):
      try:
          transacao = Transacao.objects.get(id=id)
          transacao.delete()
          return Response(status=status.HTTP_204_NO_CONTENT)
      except Transacao.DoesNotExist:
          return Response({'error': 'Transação não encontrada'}, status=status.HTTP_404_NOT_FOUND)
          
          
@api_view(['PUT'])
def editar_transacao(request, id):
      try:
          transacao = Transacao.objects.get(id=id)
          serializer = TransacaoSerializer(transacao, data=request.data, partial=True)
          if serializer.is_valid():
              serializer.save()
              return Response(serializer.data)
          return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
      except Transacao.DoesNotExist:
          return Response({'error': 'Transação não encontrada'}, status=status.HTTP_404_NOT_FOUND)
          
# views.py
from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Transacao
from .serializers import TransacaoSerializer
import logging
logger = logging.getLogger(__name__)

from django.db import connection
@api_view(['GET'])
import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Transacao
from .serializers import TransacaoSerializer

@api_view(['GET'])
def listar_transacoes(request):
    mes = request.query_params.get('mes')
    ano = request.query_params.get('ano')

    try:
        if mes and ano:
            mes = int(mes)
            ano = int(ano)
            transacoes = Transacao.objects.filter(data__month=mes, data__year=ano)
        else:
            transacoes = Transacao.objects.all()

        serializer = TransacaoSerializer(transacoes, many=True)
        return Response(serializer.data)

    except ValueError as e:
        logger.error(f"Erro ao converter mês/ano: {e}")
        return Response(
            {"error": "Mês ou ano inválido. Certifique-se de usar valores numéricos."},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Erro inesperado ao listar transações: {e}")
        return Response(
            {"error": "Ocorreu um erro ao listar as transações. Tente novamente mais tarde."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )