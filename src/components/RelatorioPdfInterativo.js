import React, { useState, useEffect } from 'react';
import './RelatorioPdfInterativo.css';

const COLS = [
  { key: 'dia', label: 'DIA', width: 60 },
  { key: 'discriminacao', label: 'DISCRIMINAÇÃO', width: 220 },
  { key: 'entrada', label: 'ENTRADA', width: 120 },
  { key: 'saida', label: 'SAÍDA', width: 120 },
];

function formatCurrency(value) {
  if (value === '' || value === undefined || value === null) return '';
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(numValue)) return '';
  return 'R$ ' + numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const RelatorioPdfInterativo = ({
  igrejaId,
  igrejaNome,
  mes,
  transactions = [],
  getTipoDespesaDisplay,
  currentMonth,
  currentYear
}) => {
  const [modoAgrupado, setModoAgrupado] = useState(true);
  const [linhasVisualizacao, setLinhasVisualizacao] = useState([]);
  // Função para agrupar e formatar as transações
  function agruparTransacoes(transacoes, modoAgrupado = true) {
    if (!modoAgrupado) {
      // Modo não agrupado: cada transação vira uma linha
      const formattedData = transacoes.map(t => {
        const dia = t.data ? t.data.split('-')[2] : '';
        let discriminacao = '';
        
        if (t.tipo === 'D') {
          discriminacao = t.descricao || 'Dízimo';
        } else if (t.tipo === 'O') {
          discriminacao = t.descricao || 'Oferta';
        } else if (t.tipo === 'S') {
          if (getTipoDespesaDisplay) {
            const tipoDespesa = getTipoDespesaDisplay(t.tipo_despesa);
            discriminacao = tipoDespesa === 'Outro' ? (t.descricao || 'Outro') : tipoDespesa;
          } else {
            discriminacao = t.descricao || 'Despesa';
          }
        }
        
        return {
          dia: dia.padStart(2, '0'),
          discriminacao,
          entrada: (t.tipo === 'D' || t.tipo === 'O') ? formatCurrency(t.quantia) : '',
          saida: t.tipo === 'S' ? formatCurrency(t.quantia) : '',
          data: t.data
        };
      });
      
      // Ordenar por data crescente
      formattedData.sort((a, b) => new Date(a.data) - new Date(b.data));
      return formattedData;
    }
    
    // Modo agrupado
    const grouped = {};
    const individuais = [];
    
    transacoes.forEach(t => {
      const dia = t.data ? t.data.split('-')[2] : '';
      
      // Saídas sempre individuais
      if (t.tipo === 'S') {
        let discriminacao = '';
        if (getTipoDespesaDisplay) {
          const tipoDespesa = getTipoDespesaDisplay(t.tipo_despesa);
          discriminacao = tipoDespesa === 'Outro' ? (t.descricao || 'Outro') : tipoDespesa;
        } else {
          discriminacao = t.descricao || 'Despesa';
        }
        
        individuais.push({
          dia: dia.padStart(2, '0'),
          discriminacao,
          entrada: '',
          saida: formatCurrency(t.quantia),
          data: t.data
        });
      }
      // Entradas marcadas com nao_agrupar também individuais
      else if (t.nao_agrupar === true) {
        const tipoNome = t.tipo === 'D' ? 'Dízimo' : 'Oferta';
        const discriminacao = t.descricao || tipoNome;
        individuais.push({
          dia: dia.padStart(2, '0'),
          discriminacao,
          entrada: formatCurrency(t.quantia),
          saida: '',
          data: t.data
        });
      }
      // Transações tipo "outro" sempre individuais (culto = 'OT')
      else if (t.culto === 'OT' || t.tipo_despesa === 'OT') {
        individuais.push({
          dia: dia.padStart(2, '0'),
          discriminacao: t.descricao || 'Outro',
          entrada: (t.tipo === 'D' || t.tipo === 'O') ? formatCurrency(t.quantia) : '',
          saida: t.tipo === 'S' ? formatCurrency(t.quantia) : '',
          data: t.data
        });
      }
      // Dízimos e ofertas com discriminação sempre individuais
      else if ((t.tipo === 'D' || t.tipo === 'O') && t.descricao && t.descricao.trim()) {
        individuais.push({
          dia: dia.padStart(2, '0'),
          discriminacao: t.descricao,
          entrada: formatCurrency(t.quantia),
          saida: '',
          data: t.data
        });
      }
      // Entradas normais SEM discriminação - podem ser agrupadas
      else {
        if (!grouped[dia]) grouped[dia] = { D: 0, O: 0 };
        if (t.tipo === 'D') grouped[dia].D += parseFloat(t.quantia || 0);
        else if (t.tipo === 'O') grouped[dia].O += parseFloat(t.quantia || 0);
      }
    });
    
    let formattedData = [];
    
    // Adicionar transações agrupadas (apenas as sem discriminação)
    Object.keys(grouped).forEach(dia => {
      if (grouped[dia].D > 0) {
        formattedData.push({ 
          dia: dia.padStart(2, '0'), 
          discriminacao: 'Dízimo', 
          entrada: formatCurrency(grouped[dia].D), 
          saida: '',
          data: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${dia}`
        });
      }
      if (grouped[dia].O > 0) {
        formattedData.push({ 
          dia: dia.padStart(2, '0'), 
          discriminacao: 'Oferta', 
          entrada: formatCurrency(grouped[dia].O), 
          saida: '',
          data: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${dia}`
        });
      }
    });
    
    // Adicionar transações individuais
    formattedData = formattedData.concat(individuais);
    
    // Ordenar por data crescente
    formattedData.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    return formattedData;
  }

  // Função para calcular indicadores
  function calcularIndicadores(transacoes) {
    const entradas = transacoes.filter(t => t.tipo === 'D' || t.tipo === 'O');
    const saidas = transacoes.filter(t => t.tipo === 'S');
    
    const totalEntradas = entradas.reduce((acc, t) => acc + parseFloat(t.quantia || 0), 0);
    const totalSaidas = saidas.reduce((acc, t) => acc + parseFloat(t.quantia || 0), 0);
    const dizimoIgreja = totalEntradas * 0.1;
    
    return {
      totalEntradas,
      totalSaidas,
      dizimoIgreja,
      saldoAnterior: 0 // Placeholder - seria necessário buscar do backend
    };
  }

  // Filtrar e processar transações automaticamente
  useEffect(() => {
    if (!transactions || transactions.length === 0) {
      setLinhasVisualizacao([]);
      return;
    }
    
    // Filtrar transações do mês atual
    const currentMonthTransactions = transactions.filter(t => {
      if (!t.data) return false;
      const [ano, mesTransacao] = t.data.split('-');
      return parseInt(ano) === currentYear && parseInt(mesTransacao) === currentMonth;
    });
    
    const agrupadas = agruparTransacoes(currentMonthTransactions, modoAgrupado);
    setLinhasVisualizacao(agrupadas);
  }, [transactions, modoAgrupado, currentMonth, currentYear]);

  // Calcular indicadores das transações filtradas
  const indicadores = transactions.length > 0 ? 
    calcularIndicadores(transactions.filter(t => {
      if (!t.data) return false;
      const [ano, mesTransacao] = t.data.split('-');
      return parseInt(ano) === currentYear && parseInt(mesTransacao) === currentMonth;
    })) : 
    { totalEntradas: 0, totalSaidas: 0, dizimoIgreja: 0, saldoAnterior: 0 };

  return (
    <div className="pdf-simulado-container">
      {(igrejaNome || mes) && (
        <div style={{ marginBottom: 16, fontWeight: 500, color: '#2c3e50', fontSize: '1.1rem', display: 'flex', gap: 18 }}>
          {igrejaNome && <span>Igreja: {igrejaNome}</span>}
          {mes && <span>Mês: {mes}</span>}
        </div>
      )}
      
      {/* Opção de agrupamento no topo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          fontSize: 16, 
          fontWeight: 600, 
          color: '#4f8cff',
          background: '#f8fafc',
          padding: '12px 20px',
          borderRadius: 12,
          border: '2px solid #e3e9f7',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}>
          <input
            type="checkbox"
            checked={modoAgrupado}
            onChange={e => setModoAgrupado(e.target.checked)}
            style={{ transform: 'scale(1.2)', marginRight: 4 }}
          />
          Agrupar dízimos e ofertas por dia
        </label>
      </div>

      {/* Tabela de visualização */}
      <table className="pdf-simulado-table" style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            {COLS.map((col) => (
              <th key={col.key} style={{ width: col.width }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhasVisualizacao.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '40px 20px', color: '#888', fontSize: '1.1rem' }}>
                Nenhuma transação encontrada para este mês
              </td>
            </tr>
          ) : (
            linhasVisualizacao.map((linha, idx) => (
              <tr key={idx}>
                {COLS.map((col) => (
                  <td key={col.key} style={{ textAlign: col.key === 'entrada' || col.key === 'saida' ? 'right' : 'left' }}>
                    {linha[col.key] || ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Indicadores no final */}
      <div className="pdf-indicadores" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginTop: 20,
        padding: 20,
        background: '#f8fafc',
        borderRadius: 12,
        border: '1px solid #e3e9f7'
      }}>
        <div className="indicador-item" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 16,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: 14, color: '#666', fontWeight: 500, marginBottom: 4 }}>Total Entradas</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#27ae60' }}>
            {formatCurrency(indicadores.totalEntradas)}
          </span>
        </div>
        
        <div className="indicador-item" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 16,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: 14, color: '#666', fontWeight: 500, marginBottom: 4 }}>Total Saídas</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#e74c3c' }}>
            {formatCurrency(indicadores.totalSaidas)}
          </span>
        </div>
        
        <div className="indicador-item" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 16,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: 14, color: '#666', fontWeight: 500, marginBottom: 4 }}>Saldo Anterior</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#3498db' }}>
            {formatCurrency(indicadores.saldoAnterior)}
          </span>
        </div>
        
        <div className="indicador-item" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 16,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <span style={{ fontSize: 14, color: '#666', fontWeight: 500, marginBottom: 4 }}>Dízimo da Igreja (10%)</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#8e44ad' }}>
            {formatCurrency(indicadores.dizimoIgreja)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RelatorioPdfInterativo;
