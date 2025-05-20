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

const RelatorioPdfInterativo = ({ linhasIniciais = 20, onTransacoesChange, igrejaId, igrejaNome, mes, onSuccess, setNotification }) => {
  const [linhas, setLinhas] = useState(
    Array.from({ length: linhasIniciais }, () => ({ dia: '', discriminacao: '', entrada: '', saida: '' }))
  );
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
