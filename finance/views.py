# finance/views.py

# Importações
import logging
from django.contrib.auth.models import User
from django.db.models import Sum
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Transacao, Relatorio
from .serializers import TransacaoSerializer, RelatorioSerializer

# Configuração do logger
logger = logging.getLogger('finance')

# -------------------------------
# Views de CRUD Genéricas
# -------------------------------

class TransacaoListCreateView(generics.ListCreateAPIView):
    """Lista todas as transações ou cria uma nova."""
    queryset = Transacao.objects.all()
    serializer_class = TransacaoSerializer

class TransacaoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """Recupera, atualiza ou deleta uma transação específica."""
    queryset = Transacao.objects.all()
    serializer_class = TransacaoSerializer

# -------------------------------
# Views de Autenticação
# -------------------------------

@api_view(['POST'])
def user_register(request):
    """Registra um novo usuário e retorna tokens JWT."""
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')

    if not username or not password:
        logger.warning("Tentativa de registro sem username ou password")
        return Response({'error': 'Username e senha são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        logger.info(f"Tentativa de registro com username existente: {username}")
        return Response({'error': 'Usuário já existe'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_user(username=username, password=password, email=email or '')
        refresh = RefreshToken.for_user(user)
        logger.info(f"Usuário registrado com sucesso: {username}")
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.exception(f"Erro ao registrar usuário {username}: {str(e)}")
        return Response({'error': 'Erro ao criar usuário'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def user_login(request):
    """Faz login e retorna tokens JWT."""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        logger.warning("Tentativa de login sem username ou password")
        return Response({'error': 'Username e senha são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(username=username).first()
    if user and user.check_password(password):
        refresh = RefreshToken.for_user(user)
        logger.info(f"Login bem-sucedido para: {username}")
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)

    logger.warning(f"Tentativa de login inválida para: {username}")
    return Response({'error': 'Credenciais inválidas'}, status=status.HTTP_400_BAD_REQUEST)

# -------------------------------
# Views de Transações Personalizadas
# -------------------------------

@api_view(['GET'])
def calcular_saldo(request):
    """Calcula o saldo total (entradas - despesas)."""
    try:
        total_entradas = Transacao.objects.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
        total_despesas = Transacao.objects.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
        saldo = total_entradas - total_despesas
        logger.info(f"Saldo calculado: {saldo} (Entradas: {total_entradas}, Despesas: {total_despesas})")
        return Response({'saldo': saldo})
    except Exception as e:
        logger.exception(f"Erro ao calcular saldo: {str(e)}")
        return Response({'error': 'Erro ao calcular saldo'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
def editar_transacao(request, id):
    """Edita uma transação existente."""
    try:
        transacao = Transacao.objects.get(id=id)
    except Transacao.DoesNotExist:
        logger.warning(f"Tentativa de editar transação inexistente: ID {id}")
        return Response({'error': 'Transação não encontrada'}, status=status.HTTP_404_NOT_FOUND)

    serializer = TransacaoSerializer(transacao, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        logger.info(f"Transação editada com sucesso: ID {id}")
        return Response(serializer.data)
    logger.error(f"Erro ao editar transação ID {id}: {serializer.errors}")
    return Response({'error': 'Dados inválidos', 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
def deletar_transacao(request, id):
    """Deleta uma transação existente."""
    try:
        transacao = Transacao.objects.get(id=id)
        transacao.delete()
        logger.info(f"Transação deletada com sucesso: ID {id}")
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Transacao.DoesNotExist:
        logger.warning(f"Tentativa de deletar transação inexistente: ID {id}")
        return Response({'error': 'Transação não encontrada'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Erro ao deletar transação ID {id}: {str(e)}")
        return Response({'error': 'Erro ao deletar transação'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def listar_transacoes(request):
    """Lista transações com filtros opcionais de mês e ano."""
    logger.info("Requisição recebida - Parâmetros: %s", request.query_params)
    try:
        mes = request.query_params.get('mes')
        ano = request.query_params.get('ano')
        filtros = {}
        if mes:
            filtros["data__month"] = int(mes)
        if ano:
            filtros["data__year"] = int(ano)
        queryset = Transacao.objects.filter(**filtros).order_by('-data')  # Ordena por data decrescente
        serializer = TransacaoSerializer(queryset, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.exception(f"Erro ao listar transações: {str(e)}")
        return Response({'error': 'Erro interno ao listar transações'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------------------
# Views de Relatórios
# -------------------------------

class RelatorioListView(APIView):
    """Lista todos os relatórios ou cria um novo."""
    def get(self, request):
        relatorios = Relatorio.objects.all().order_by('-data_geracao')
        serializer = RelatorioSerializer(relatorios, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = RelatorioSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SalvarRelatorioView(APIView):
    """Salva um relatório enviado pelo frontend."""
    def post(self, request):
        nome = request.data.get('nome')
        mes = request.data.get('mes')
        ano = request.data.get('ano')
        arquivo = request.FILES['arquivo']

        relatorio = Relatorio.objects.create(
            nome=nome,
            mes=mes,
            ano=ano,
            arquivo=arquivo
        )

        return Response({
            'message': 'Relatório salvo com sucesso!',
            'url': relatorio.arquivo.url
        }, status=status.HTTP_201_CREATED)

class DeletarRelatorioView(APIView):
    """Deleta um relatório existente."""
    def delete(self, request, relatorio_id):
        try:
            relatorio = Relatorio.objects.get(id=relatorio_id)
            relatorio.delete()
            return Response({'message': 'Relatório deletado com sucesso!'}, status=status.HTTP_204_NO_CONTENT)
        except Relatorio.DoesNotExist:
            return Response({'error': 'Relatório não encontrado!'}, status=status.HTTP_404_NOT_FOUND)
