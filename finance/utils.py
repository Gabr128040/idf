from django.db.models import Sum
from datetime import datetime, date, timedelta
import logging

logger = logging.getLogger('finance')

def calcular_saldo_mes_atual(igreja_id, mes=None, ano=None):
    """Calcula o saldo considerando apenas transações do mês especificado."""
    try:
        from .models import Transacao
        
        if mes is None:
            mes = datetime.now().month
        if ano is None:
            ano = datetime.now().year
        
        transacoes = Transacao.objects.filter(
            igreja_id=igreja_id,
            data__month=mes,
            data__year=ano
        )
        
        entradas = transacoes.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
        saidas = transacoes.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
        
        return float(entradas - saidas)
    except Exception as e:
        logger.exception(f"Erro ao calcular saldo do mês atual: {str(e)}")
        raise

def calcular_saldo_ate_mes(igreja_id, mes=None, ano=None):
    """Calcula o saldo total considerando todas as transações até o final do mês especificado."""
    try:
        from .models import Transacao
        
        if mes is None:
            mes = datetime.now().month
        if ano is None:
            ano = datetime.now().year
        
        # Calcula o último dia do mês
        if mes == 12:
            data_limite = date(ano + 1, 1, 1) - timedelta(days=1)
        else:
            data_limite = date(ano, mes + 1, 1) - timedelta(days=1)
        
        transacoes = Transacao.objects.filter(
            igreja_id=igreja_id,
            data__lte=data_limite
        )
        
        entradas = transacoes.filter(tipo__in=['D', 'O']).aggregate(Sum('quantia'))['quantia__sum'] or 0
        saidas = transacoes.filter(tipo='S').aggregate(Sum('quantia'))['quantia__sum'] or 0
        
        return float(entradas - saidas)
    except Exception as e:
        logger.exception(f"Erro ao calcular saldo até o mês: {str(e)}")
        raise
