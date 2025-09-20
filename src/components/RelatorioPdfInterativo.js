import React, { useState } from 'react';
import './RelatorioPdfInterativo.css';
import { createManualTransaction } from '../api/transactions';

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
  linhasIniciais = 20,
  onTransacoesChange,
  igrejaId,
  igrejaNome,
  mes,
  onSuccess,
  setNotification,
  transactions = [], // Receber as transações do Dashboard
  getTipoDespesaDisplay
}) => {
  const [linhas, setLinhas] = useState(
    Array.from({ length: linhasIniciais }, () => ({ dia: '', discriminacao: '', entrada: '', saida: '' }))
  );
  const [modoAgrupado, setModoAgrupado] = useState(true);
  // Função para agrupar e formatar as transações igual ao gerador de PDF
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
          entrada: (t.tipo === 'D' || t.tipo === 'O') ? parseFloat(t.quantia || 0).toFixed(2) : '',
          saida: t.tipo === 'S' ? parseFloat(t.quantia || 0).toFixed(2) : '',
          data: t.data
        };
      });
      
      // Ordenar por data crescente
      formattedData.sort((a, b) => new Date(a.data) - new Date(b.data));
      return formattedData;
    }
    
    // Modo agrupado (igual ao gerador de PDF)
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
          saida: parseFloat(t.quantia || 0).toFixed(2),
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
          entrada: parseFloat(t.quantia || 0).toFixed(2),
          saida: '',
          data: t.data
        });
      }
      // Entradas normais agrupadas
      else {
        if (!grouped[dia]) grouped[dia] = { D: 0, O: 0 };
        if (t.tipo === 'D') grouped[dia].D += parseFloat(t.quantia || 0);
        else if (t.tipo === 'O') grouped[dia].O += parseFloat(t.quantia || 0);
      }
    });
    
    let formattedData = [];
    
    // Adicionar transações agrupadas
    Object.keys(grouped).forEach(dia => {
      if (grouped[dia].D > 0) {
        formattedData.push({ 
          dia: dia.padStart(2, '0'), 
          discriminacao: 'Dízimo', 
          entrada: grouped[dia].D.toFixed(2), 
          saida: '',
          data: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${dia}`
        });
      }
      if (grouped[dia].O > 0) {
        formattedData.push({ 
          dia: dia.padStart(2, '0'), 
          discriminacao: 'Oferta', 
          entrada: grouped[dia].O.toFixed(2), 
          saida: '',
          data: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${dia}`
        });
      }
    });
    
    // Adicionar transações individuais
    formattedData = formattedData.concat(individuais);
    
    // Ordenar por data crescente
    formattedData.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    return formattedData;
  }

  // Handler do botão de importar - filtra apenas transações do mês atual
  const handleImportarTransacoes = () => {
    if (!transactions || transactions.length === 0) return;
    
    // Filtrar transações apenas do mês atual
    const currentYear = new Date().getFullYear();
    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                       'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const currentMonthNumber = monthNames.indexOf(mes.toLowerCase()) + 1;
    
    const currentMonthTransactions = transactions.filter(t => {
      if (!t.data) return false;
      const [ano, mesTransacao] = t.data.split('-');
      return parseInt(ano) === currentYear && parseInt(mesTransacao) === currentMonthNumber;
    });
    
    if (currentMonthTransactions.length === 0) {
      if (setNotification) {
        setNotification({
          type: 'warning',
          message: `Nenhuma transação encontrada para o mês de ${mes} de ${currentYear}.`
        });
      }
      return;
    }
    
    const agrupadas = agruparTransacoes(currentMonthTransactions, modoAgrupado);
    // Adiciona apenas 2 linhas extras vazias
    const extras = Array.from({ length: 2 }, () => ({ dia: '', discriminacao: '', entrada: '', saida: '' }));
    setLinhas([...agrupadas, ...extras]);
    if (onTransacoesChange) onTransacoesChange([...agrupadas, ...extras]);
    
    if (setNotification) {
      setNotification({
        type: 'success',
        message: `${currentMonthTransactions.length} transação${currentMonthTransactions.length > 1 ? 'ões' : ''} de ${mes} importada${currentMonthTransactions.length > 1 ? 's' : ''} com sucesso!`
      });
    }
  };
  const [editCell, setEditCell] = useState({ idx: null, col: null });
  const [editValue, setEditValue] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleCellClick = (idx, colKey) => {
    setEditCell({ idx, col: colKey });
    setEditValue(linhas[idx][colKey] || '');
  };

  const handleInputChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (editCell.idx === null || editCell.col === null) return;
    const novasLinhas = linhas.map((linha, idx) =>
      idx === editCell.idx ? { ...linha, [editCell.col]: editValue } : linha
    );
    setLinhas(novasLinhas);
    setEditCell({ idx: null, col: null });
    setEditValue('');
    if (onTransacoesChange) onTransacoesChange(novasLinhas);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // Função para converter e salvar as linhas como transações reais
  const handleSalvarTransacoes = async () => {
    setSalvando(true);
    let erros = [];
    let salvos = 0;
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i];
      // Só salva se tiver dia, discriminação e valor (entrada ou saída)
      if (!l.dia || !l.discriminacao || (!l.entrada && !l.saida)) continue;
      if (l.entrada && l.saida) {
        erros.push(`Linha ${i + 1}: Preencha apenas entrada OU saída.`);
        continue;
      }
      // Inferir tipo e valor com lógica melhorada
      let tipo = 'S';
      let quantia = null;
      let tipo_despesa = null;
      
      if (l.entrada && !l.saida) {
        const discrim = l.discriminacao.toLowerCase().trim();
        
        // Lógica mais precisa para determinar o tipo
        if (discrim === 'dízimo' || discrim === 'dizimo' || 
            discrim.includes('dízimo da') || discrim.includes('dizimo da')) {
          tipo = 'D';
        } else if (discrim === 'oferta' || discrim.includes('oferta')) {
          tipo = 'O';
        } else {
          // Para outras discriminações em entrada, assumir como oferta
          tipo = 'O';
        }
        
        quantia = parseFloat(l.entrada.toString().replace(/[^0-9,\.]/g, '').replace(',', '.'));
      } else if (l.saida && !l.entrada) {
        tipo = 'S';
        // Para saídas, definir tipo_despesa como 'OT' (Outro) por padrão
        tipo_despesa = 'OT';
        quantia = parseFloat(l.saida.toString().replace(/[^0-9,\.]/g, '').replace(',', '.'));
      }
      if (!quantia || isNaN(quantia)) {
        erros.push(`Linha ${i + 1}: Valor inválido.`);
        continue;
      }
      // Montar data
      const now = new Date();
      const mes = (now.getMonth() + 1).toString().padStart(2, '0');
      const ano = now.getFullYear();
      const dia = l.dia.padStart(2, '0');
      const data = `${ano}-${mes}-${dia}`;
      // Montar objeto transação
      const transacao = {
        tipo,
        quantia,
        data,
        descricao: l.discriminacao, // Usar descricao em vez de discriminacao
        manual: true,
        igreja_id: igrejaId,
      };
      
      // Adicionar tipo_despesa se for saída
      if (tipo === 'S' && tipo_despesa) {
        transacao.tipo_despesa = tipo_despesa;
      }
      try {
        await createManualTransaction(transacao);
        salvos++;
      } catch (err) {
        erros.push(`Linha ${i + 1}: ${err.message}`);
      }
    }
    setSalvando(false);
    if (salvos > 0) {
      if (onSuccess) onSuccess();
      if (setNotification) setNotification({ message: `${salvos} transação(ões) salva(s) com sucesso!`, type: 'success' });
    }
    if (erros.length > 0 && setNotification) {
      setNotification({ message: erros.join('\n'), type: 'error' });
    }
  };

  return (
    <div className="pdf-simulado-container">
      {(igrejaNome || mes) && (
        <div style={{ marginBottom: 10, fontWeight: 500, color: '#2c3e50', fontSize: '1.08rem', display: 'flex', gap: 18 }}>
          {igrejaNome && <span>Igreja: {igrejaNome}</span>}
          {mes && <span>Mês: {mes}</span>}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: '#4f8cff' }}>
            <input
              type="checkbox"
              checked={modoAgrupado}
              onChange={e => setModoAgrupado(e.target.checked)}
              style={{ transform: 'scale(1.1)' }}
            />
            Agrupar dízimos e ofertas por dia
          </label>
        </div>
        <button
          className="dashboard-btn-secondary"
          style={{ minWidth: 180 }}
          onClick={handleImportarTransacoes}
          disabled={!transactions || transactions.length === 0}
        >
          Importar transações do mês
        </button>
      </div>
      <table className="pdf-simulado-table">
        <thead>
          <tr>
            {COLS.map((col) => (
              <th key={col.key} style={{ width: col.width }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, idx) => (
            <tr key={idx}>
              {COLS.map((col) => (
                <td
                  key={col.key}
                  onClick={() => handleCellClick(idx, col.key)}
                  style={{ cursor: 'pointer' }}
                >
                  {editCell.idx === idx && editCell.col === col.key ? (
                    col.key === 'discriminacao' ? (
                      <textarea
                        name={col.key}
                        value={editValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        autoFocus
                        style={{ width: '100%', fontSize: 14, minHeight: 32, resize: 'vertical', padding: '7px 4px', borderRadius: 6, boxSizing: 'border-box', lineHeight: 1.3 }}
                        placeholder={col.label}
                        rows={1}
                      />
                    ) : (
                      <input
                        name={col.key}
                        value={editValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        autoFocus
                        style={{ width: '90%', fontSize: 14 }}
                        type={col.key === 'dia' ? 'text' : 'text'}
                        placeholder={col.label}
                      />
                    )
                  ) : col.key === 'entrada' || col.key === 'saida' ? (
                    formatCurrency(linha[col.key])
                  ) : (
                    linha[col.key]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="dashboard-btn-primary"
        style={{ marginTop: 18, minWidth: 180 }}
        onClick={handleSalvarTransacoes}
        disabled={salvando || !igrejaId}
      >
        {salvando ? 'Salvando...' : 'Salvar como transações reais'}
      </button>
    </div>
  );
};

export default RelatorioPdfInterativo;
