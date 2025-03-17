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