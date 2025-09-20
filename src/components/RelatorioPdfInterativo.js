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
  if (value === '' || value === undefined) return '';
  return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
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
  // Função para agrupar e formatar as transações igual ao PDF
  function agruparTransacoes(transacoes) {
    // Agrupar dízimos e ofertas por dia
    const grouped = {};
    transacoes.forEach(t => {
      const [ano, mes, dia] = t.data.split('-');
      if (!grouped[dia]) grouped[dia] = { D: 0, O: 0, outros: [] };
      if (t.tipo === 'D') grouped[dia].D += parseFloat(t.quantia);
      else if (t.tipo === 'O') grouped[dia].O += parseFloat(t.quantia);
      else grouped[dia].outros.push(t);
    });
    // Montar formattedData agrupando D e O, mantendo outros
    let formattedData = [];
    Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b)).forEach(dia => {
      if (grouped[dia].D > 0) formattedData.push({ dia, discriminacao: 'Dízimo', entrada: grouped[dia].D, saida: '' });
      if (grouped[dia].O > 0) formattedData.push({ dia, discriminacao: 'Oferta', entrada: grouped[dia].O, saida: '' });
      grouped[dia].outros.forEach(t => {
        let discriminacao = '';
        if (t.tipo === 'S') {
          if (getTipoDespesaDisplay) {
            const tipoDespesa = getTipoDespesaDisplay(t.tipo_despesa);
            discriminacao = tipoDespesa === 'Outro' ? (t.descricao || 'Outro') : tipoDespesa;
          } else {
            discriminacao = t.descricao || 'Despesa';
          }
        }
        formattedData.push({
          dia,
          discriminacao,
          entrada: '',
          saida: t.tipo === 'S' ? t.quantia : '',
        });
      });
    });
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
    
    const agrupadas = agruparTransacoes(currentMonthTransactions);
    // Adiciona 2 linhas extras vazias
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
      // Inferir tipo e valor
      let tipo = 'S';
      let quantia = null;
      if (l.entrada && !l.saida) {
        const discrim = l.discriminacao.toLowerCase();
        if (discrim.includes('dizimo') || discrim.includes('dízimo')) {
          tipo = 'D';
        } else if (discrim.includes('oferta')) {
          tipo = 'O';
        } else {
          tipo = 'O'; // padrão para entrada
        }
        quantia = parseFloat(l.entrada.replace(/[^0-9,\.]/g, '').replace(',', '.'));
      } else if (l.saida && !l.entrada) {
        tipo = 'S';
        quantia = parseFloat(l.saida.replace(/[^0-9,\.]/g, '').replace(',', '.'));
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
        discriminacao: l.discriminacao,
        manual: true,
        igreja_id: igrejaId,
      };
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          className="dashboard-btn-secondary"
          style={{ minWidth: 180, marginRight: 8 }}
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
