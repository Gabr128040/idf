# finance/views.py

# Importações
import logging
from django.contrib.auth.models import User
from django.db.models import Sum, Count
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import datetime, timedelta
from django.db import connection
import os
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Transacao, Relatorio, Igreja, Profile
from .serializers import TransacaoSerializer, RelatorioSerializer, IgrejaSerializer, ProfileSerializer
from django.contrib.auth.models import Group
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import permission_classes
from . import drive_backup

# Configuração do logger
logger = logging.getLogger('finance')

# -------------------------------
# Views de Monitoramento do Sistema
# -------------------------------

@api_view(['GET'])
def verificar_saude_sistema(request):
    """Verifica o status do banco de dados e outros componentes do sistema."""
    try:
        # Verifica conexão com o banco de dados
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        return Response({
            'status': 'ok',
            'database_status': 'ok',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.exception("Erro ao verificar saúde do sistema")
        return Response({
            'status': 'error',
            'database_status': 'error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def verificar_status_backup(request):
    """Verifica o status dos backups do sistema."""
    try:
        # Diretório onde os relatórios são armazenados
        relatorios_backup_path = os.path.join('media', 'relatorios')
        
        # Verifica os backups de relatórios
        relatorios_ok = os.path.exists(relatorios_backup_path)
        
        # Verifica o último backup do banco de dados
        db_path = os.path.join('db.sqlite3')
        db_exists = os.path.exists(db_path)
        
        if db_exists:
            db_last_modified = datetime.fromtimestamp(os.path.getmtime(db_path))
            db_age_hours = (datetime.now() - db_last_modified).total_seconds() / 3600
            db_backup_ok = db_age_hours < 24  # Considera OK se o backup tem menos de 24 horas
        else:
            db_backup_ok = False
        
        return Response({
            'reports': 'ok' if relatorios_ok else 'error',
            'database': 'ok' if db_backup_ok else 'error',
            'last_db_backup': db_last_modified.isoformat() if db_exists else None,
            'drive_configured': True if os.environ.get('GOOGLE_SERVICE_ACCOUNT_FILE') and os.environ.get('DRIVE_BACKUP_FOLDER_ID') else False,
        })
    except Exception as e:
        logger.exception("Erro ao verificar status dos backups")
        return Response({
            'reports': 'error',
            'database': 'error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_backup(request):
    """Dispara backup do banco e relatórios para o Google Drive (pastas configuradas via env)."""
    folder_db = os.environ.get('DRIVE_DB_FOLDER_ID') or os.environ.get('DRIVE_BACKUP_FOLDER_ID')
    folder_reports = os.environ.get('DRIVE_REPORTS_FOLDER_ID') or os.environ.get('DRIVE_BACKUP_FOLDER_ID')
    try:
        result = drive_backup.backup_all(folder_db, folder_reports)
        return Response({'ok': True, 'result': result})
    except Exception as e:
        logger.exception('Erro ao executar backup: %s', e)
        return Response({'ok': False, 'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_backups(request):
    """Lista backups presentes na pasta configurada no Drive."""
    folder = os.environ.get('DRIVE_BACKUP_FOLDER_ID')
    if not folder:
        return Response({'error': 'Drive folder not configured'}, status=status.HTTP_400_BAD_REQUEST)
    files = drive_backup.list_files_in_folder(folder, page_size=50)
    return Response({'files': files})

# CRUD de Igrejas
class IgrejaListCreateView(generics.ListCreateAPIView):
    queryset = Igreja.objects.all()
    serializer_class = IgrejaSerializer

class IgrejaRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Igreja.objects.all()
    serializer_class = IgrejaSerializer

# Listar transações de uma igreja específica
class TransacoesPorIgrejaView(generics.ListAPIView):
    serializer_class = TransacaoSerializer

    def get_queryset(self):
        igreja_id = self.kwargs['igreja_id']
        return Transacao.objects.filter(igreja_id=igreja_id)

# Listar relatórios de uma igreja específica
class RelatoriosPorIgrejaView(generics.ListAPIView):
    serializer_class = RelatorioSerializer

    def get_queryset(self):
        igreja_id = self.kwargs['igreja_id']
        return Relatorio.objects.filter(igreja_id=igreja_id)

# -------------------------------
# Views de CRUD Genéricas
# -------------------------------

class TransacaoListCreateView(generics.ListCreateAPIView):
    """Lista todas as transações ou cria uma nova."""
    queryset = Transacao.objects.all()
    serializer_class = TransacaoSerializer

    def create(self, request, *args, **kwargs):
        logger.info(f"[TransacaoListCreateView] Dados recebidos para criação: {request.data}")
        response = super().create(request, *args, **kwargs)
        if response.status_code >= 400:
            logger.error(f"[TransacaoListCreateView] Erro ao criar transação: {response.data}")
        else:
            logger.info(f"[TransacaoListCreateView] Transação criada com sucesso: {response.data}")
        return response

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
    igreja_id = request.data.get('igreja_id')

    if not username or not password or not igreja_id:
        logger.warning("Tentativa de registro sem username, senha ou igreja")
        return Response({'error': 'Username, senha e igreja são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        logger.info(f"Tentativa de registro com username existente: {username}")
        return Response({'error': 'Usuário já existe'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_user(username=username, password=password, email=email or '')
        igreja = Igreja.objects.get(id=igreja_id)
        Profile.objects.create(user=user, igreja=igreja)
        refresh = RefreshToken.for_user(user)
        logger.info(f"Usuário registrado com sucesso: {username}")
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)
    except Igreja.DoesNotExist:
        logger.warning(f"Igreja não encontrada para registro: {igreja_id}")
        return Response({'error': 'Igreja não encontrada'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception(f"Erro ao registrar usuário {username}: {str(e)}")
        return Response({'error': 'Erro ao criar usuário'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def user_login(request):
    """Faz login e retorna tokens JWT, tipo de usuário e igreja."""
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        logger.warning("Tentativa de login sem username ou password")
        return Response({'error': 'Username e senha são obrigatórios'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(username=username).first()
    if user and user.check_password(password):
        refresh = RefreshToken.for_user(user)
        logger.info(f"Login bem-sucedido para: {username}")
        # Verifica se o usuário é do grupo 'Cordenadores'
        is_igreja_admin = user.groups.filter(name='Cordenadores').exists()
        is_superuser = user.is_superuser
        igreja = None
        if hasattr(user, 'profile'):
            igreja = user.profile.igreja
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'username': user.username,
                'is_igreja_admin': is_igreja_admin,
                'is_superuser': is_superuser,
                'igreja': IgrejaSerializer(igreja).data if igreja else None
            }
        }, status=status.HTTP_200_OK)

    logger.warning(f"Tentativa de login inválida para: {username}")
    return Response({'error': 'Credenciais inválidas'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Retorna os dados do usuário autenticado e sua igreja."""
    user = request.user
    profile = getattr(user, 'profile', None)
    igreja = profile.igreja if profile else None
    data = {
        'username': user.username,
        'email': user.email,
        'igreja': IgrejaSerializer(igreja).data if igreja else None
    }
    return Response(data)

# -------------------------------
# Views de Transações Personalizadas
# -------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calcular_saldo(request):
    """
    Calcula saldo com opções:
    - Saldo atual (todas as transações)
    - Saldo até um mês específico (total em caixa até fim do mês)
    - Saldo apenas do mês (transações apenas do mês)
    """
    try:
        igreja_id = request.query_params.get('igreja_id')
        mes = request.query_params.get('mes')
        ano = request.query_params.get('ano')
        tipo_saldo = request.query_params.get('tipo', 'atual')  # 'atual', 'ate_mes', 'mes'
        
        if not igreja_id:
            return Response({'error': 'igreja_id é obrigatório'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Se mês/ano não fornecidos, usar data atual
        if not mes or not ano:
            data_atual = datetime.now()
            mes = data_atual.month
            ano = data_atual.year
        else:
            mes = int(mes)
            ano = int(ano)
            
        from .utils import calcular_saldo_ate_mes, calcular_saldo_mes_atual
        
        if tipo_saldo == 'ate_mes':
            # Calcula total em caixa até o fim do mês especificado
            saldo = calcular_saldo_ate_mes(igreja_id, mes, ano)
        elif tipo_saldo == 'mes':
            # Calcula saldo apenas das transações do mês
            saldo = calcular_saldo_mes_atual(igreja_id, mes, ano)
        else:
            # Saldo atual (todas as transações até agora)
            qs = Transacao.objects.filter(igreja_id=igreja_id)
            total_entradas = qs.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
            total_despesas = qs.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
            saldo = float(total_entradas - total_despesas)
            
        logger.info(f"Saldo calculado ({tipo_saldo}): {saldo} (Igreja: {igreja_id}, Mês: {mes}, Ano: {ano})")
        return Response({
            'saldo': saldo,
            'mes': mes,
            'ano': ano,
            'tipo': tipo_saldo
        })
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
@permission_classes([IsAuthenticated])
def estatisticas_transacoes(request):
    """Retorna estatísticas das transações.

    Parâmetros de query opcionais:
    - months: número de meses (int) a retornar, padrão 6, máximo 24
    - start: data inicial (YYYY-MM-DD)
    - end: data final (YYYY-MM-DD)
    """
    try:
        # Obtém a igreja do usuário autenticado
        igreja = request.user.profile.igreja if hasattr(request.user, 'profile') else None
        if not igreja:
            return Response({'error': 'Igreja não encontrada'}, status=status.HTTP_404_NOT_FOUND)

        # Parâmetros
        months = int(request.query_params.get('months') or 6)
        months = max(1, min(months, 24))
        start_param = request.query_params.get('start')
        end_param = request.query_params.get('end')

        hoje = datetime.now()
        if start_param and end_param:
            try:
                data_inicial = datetime.fromisoformat(start_param)
                data_final = datetime.fromisoformat(end_param)
            except Exception:
                data_inicial = hoje - timedelta(days=30 * months)
                data_final = hoje
        else:
            data_final = hoje
            data_inicial = hoje - timedelta(days=30 * months)

        # Filtra transações por igreja e período
        transacoes = Transacao.objects.filter(
            igreja=igreja,
            data__gte=data_inicial.date(),
            data__lte=data_final.date()
        )

        # Gera lista de meses (ordenada do mais antigo para o mais recente)
        monthlyTotals = []
        for i in range(months - 1, -1, -1):
            # calcular ano/mês subtraindo i meses
            ref = data_final - timedelta(days=30 * i)
            year = ref.year
            month = ref.month
            transacoes_mes = transacoes.filter(
                data__month=month,
                data__year=year
            )

            entradas = transacoes_mes.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
            saidas = transacoes_mes.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
            dizimos = transacoes_mes.filter(tipo='D').aggregate(Sum('quantia'))['quantia__sum'] or 0
            ofertas = transacoes_mes.filter(tipo='O').aggregate(Sum('quantia'))['quantia__sum'] or 0
            outros = float(entradas or 0) - float(dizimos or 0) - float(ofertas or 0)

            monthlyTotals.append({
                'month': f"{month:02d}/{year}",
                'income': float(entradas),
                'expenses': float(saidas),
                'dizimos': float(dizimos or 0),
                'ofertas': float(ofertas or 0),
                'outros': float(max(0, outros))
            })

        # Composição agregada no período
        total_entradas = transacoes.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
        total_dizimos = transacoes.filter(tipo='D').aggregate(Sum('quantia'))['quantia__sum'] or 0
        total_ofertas = transacoes.filter(tipo='O').aggregate(Sum('quantia'))['quantia__sum'] or 0
        total_outros = float(total_entradas or 0) - float(total_dizimos or 0) - float(total_ofertas or 0)

        # Variação em relação ao mês anterior ao último mês do período
        ultimo = data_final
        anterior = ultimo - timedelta(days=30)
        mes_ultimo = transacoes.filter(data__month=ultimo.month, data__year=ultimo.year)
        mes_anterior = transacoes.filter(data__month=anterior.month, data__year=anterior.year)

        def calcular_variacao(atual, anterior):
            try:
                atual = float(atual or 0)
                anterior = float(anterior or 0)
                if anterior == 0:
                    return 100.0 if atual > 0 else 0.0
                return ((atual - anterior) / anterior) * 100.0
            except Exception:
                return 0.0

        entradas_atual = mes_ultimo.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
        entradas_anterior = mes_anterior.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
        saidas_atual = mes_ultimo.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
        saidas_anterior = mes_anterior.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
        dizimos_atual = mes_ultimo.filter(tipo='D').aggregate(Sum('quantia'))['quantia__sum'] or 0
        dizimos_anterior = mes_anterior.filter(tipo='D').aggregate(Sum('quantia'))['quantia__sum'] or 0
        ofertas_atual = mes_ultimo.filter(tipo='O').aggregate(Sum('quantia'))['quantia__sum'] or 0
        ofertas_anterior = mes_anterior.filter(tipo='O').aggregate(Sum('quantia'))['quantia__sum'] or 0

        return Response({
            'monthlyTotals': monthlyTotals,
            'composition': {
                'dizimos': float(total_dizimos or 0),
                'ofertas': float(total_ofertas or 0),
                'outros': float(max(0, total_outros))
            },
            'comparison': {
                'income_variation': calcular_variacao(entradas_atual, entradas_anterior),
                'expenses_variation': calcular_variacao(saidas_atual, saidas_anterior),
                'dizimos_variation': calcular_variacao(dizimos_atual, dizimos_anterior),
                'ofertas_variation': calcular_variacao(ofertas_atual, ofertas_anterior)
            }
        })
    except Exception as e:
        logger.exception(f"Erro ao obter estatísticas: {str(e)}")
        return Response({'error': 'Erro ao obter estatísticas'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def listar_transacoes(request):
    """Lista transações com filtros opcionais de mês, ano e igreja."""
    logger.info("Requisição recebida - Parâmetros: %s", request.query_params)
    try:
        mes = request.query_params.get('mes')
        ano = request.query_params.get('ano')
        igreja_id = request.query_params.get('igreja_id')
        filtros = {}
        if mes:
            filtros["data__month"] = int(mes)
        if ano:
            filtros["data__year"] = int(ano)
        if igreja_id:
            filtros["igreja_id"] = int(igreja_id)
        queryset = Transacao.objects.filter(**filtros).order_by('-data')
        serializer = TransacaoSerializer(queryset, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.exception(f"Erro ao listar transações: {str(e)}")
        return Response({'error': 'Erro interno ao listar transações'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# -------------------------------
# Views de Simulação
# -------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def simular_fechamento(request):
    """Simula o fechamento do mês, calculando totais e saldos sem salvar mudanças."""
    try:
        # Obtém parâmetros
        mes = int(request.query_params.get('mes', datetime.now().month))
        ano = int(request.query_params.get('ano', datetime.now().year))
        igreja = request.user.profile.igreja if hasattr(request.user, 'profile') else None
        
        if not igreja:
            return Response({'error': 'Igreja não encontrada'}, status=status.HTTP_404_NOT_FOUND)
            
        # Filtra transações do mês
        transacoes = Transacao.objects.filter(
            igreja=igreja,
            data__month=mes,
            data__year=ano
        )
        
        # Calcula totais
        entradas = transacoes.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
        saidas = transacoes.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
        
        # Calcula saldo do mês e total em caixa
        saldo_mes = float(entradas - saidas)
        
        # Calcula saldo anterior (até o mês anterior)
        from .utils import calcular_saldo_ate_mes
        mes_anterior = mes - 1
        ano_anterior = ano
        if mes_anterior == 0:
            mes_anterior = 12
            ano_anterior = ano - 1
        saldo_anterior = calcular_saldo_ate_mes(igreja.id, mes_anterior, ano_anterior)
        
        # Calcula saldo final (saldo anterior + saldo do mês)
        saldo_final = saldo_anterior + saldo_mes
        
        return Response({
            'totalEntradas': float(entradas),
            'totalSaidas': float(saidas),
            'saldoMes': float(saldo_mes),
            'saldoAnterior': float(saldo_anterior),
            'saldoFinal': float(saldo_final),
            'dizimoIgreja': float(entradas) * 0.1 if entradas > 0 else 0,
            'mes': mes,
            'ano': ano
        })
        
    except Exception as e:
        logger.exception(f"Erro ao simular fechamento: {str(e)}")
        return Response(
            {'error': f'Erro ao simular fechamento: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# -------------------------------
# Views de Relatórios
# -------------------------------

class RelatorioListView(APIView):
    """Lista todos os relatórios da igreja do usuário autenticado ou todos se admin."""
    def get(self, request):
        user = request.user
        igreja = None
        if hasattr(user, 'profile'):
            igreja = user.profile.igreja
        if user.is_superuser or user.groups.filter(name='Cordenadores').exists():
            relatorios = Relatorio.objects.all().order_by('-data_geracao')
        elif igreja:
            relatorios = Relatorio.objects.filter(igreja=igreja).order_by('-data_geracao')
        else:
            relatorios = Relatorio.objects.none()
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
