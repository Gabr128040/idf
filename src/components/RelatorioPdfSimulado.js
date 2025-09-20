import React, { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';
import { truncateToTwoDecimals, getTipoDespesaDisplay, getLastDayOfMonth } from '../utils';

// Componente de visualização "simulada" do PDF, igual à prévia, mas para uso dinâmico na Dashboard
const RelatorioPdfSimulado = ({ transactions, currentMonth, currentYear, previewData, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja }) => {
  const iframeRef = useRef();

  useEffect(() => {
    if (!previewData) return;
    const formattedData = getFormattedTableData(transactions || [], currentMonth, currentYear, previewData, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja);
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    try {
      doc.addImage(logo, 'PNG', 10, 10, 15, 15);
    } catch {}
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.text('IGREJA DE DEUS MISSIONÁRIA', 105, 15, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.text('CNPJ: 05.869.914/0001-07', 105, 20, { align: 'center' });
    doc.text('DEPARTAMENTO FINANCEIRO', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`MÊS: ${new Date(0, currentMonth - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}`, 10, 35);
    doc.text(`ANO: ${currentYear}`, 105, 35, { align: 'center' });
    doc.text('EBENÉZER', 200 - 10, 35, { align: 'right' });
    autoTable(doc, {
      startY: 40,
      head: [['DIA', 'DISCRIMINAÇÃO', 'ENTRADA', 'SAÍDA']],
      body: formattedData.map(row => [row.dia, row.discriminacao, row.entrada !== undefined ? row.entrada : '-', row.saida !== undefined ? row.saida : '-']),
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 80 }, 2: { cellWidth: 40, halign: 'right' }, 3: { cellWidth: 40, halign: 'right' } },
    });
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
    return () => URL.revokeObjectURL(url);
  }, [transactions, currentMonth, currentYear, previewData, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja]);

  // Função atualizada para considerar nao_agrupar
  function getFormattedTableData(transactions, currentMonth, currentYear, previewData, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja) {
    let baseTransacoes = transactions.filter(t => {
      const [ano, mes] = t.data.split('-');
      return parseInt(mes) === currentMonth && parseInt(ano) === currentYear;
    });
    
    const lastDayOfMonth = getLastDayOfMonth(currentYear, currentMonth);
    let transacoesExtras = [];
    if (includeGratificacao) {
      transacoesExtras.push({ tipo: 'S', descricao: 'Gratificação do Líder', quantia: 900, data: lastDayOfMonth, nao_agrupar: true });
    }
    if (includeDizimoGratificacao) {
      transacoesExtras.push({ tipo: 'D', descricao: 'Dízimo da Gratificação', quantia: 90, data: lastDayOfMonth, nao_agrupar: false });
    }
    if (includeDizimoIgreja && previewData) {
      transacoesExtras.push({ tipo: 'S', descricao: 'Dízimo da Igreja', quantia: previewData.dizimoIgreja, data: lastDayOfMonth, nao_agrupar: true });
    }
    
    const todasTransacoes = [...baseTransacoes, ...transacoesExtras];
    
    // Separar agrupadas e individuais
    const grouped = {};
    const individuais = [];
    
    todasTransacoes.forEach(t => {
      const day = t.data ? t.data.split('-')[2] : '';
      
      // Saídas sempre individuais
      if (t.tipo === 'S') {
        individuais.push({
          dia: day.padStart(2, '0'),
          discriminacao: t.descricao || 'Despesa',
          entrada: '-',
          saida: `R$ ${truncateToTwoDecimals(parseFloat(t.quantia) || 0)}`,
          data: t.data
        });
      }
      // Entradas marcadas com nao_agrupar também individuais
      else if (t.nao_agrupar === true) {
        const tipoNome = t.tipo === 'D' ? 'Dízimo' : 'Oferta';
        const discriminacao = t.descricao || tipoNome;
        individuais.push({
          dia: day.padStart(2, '0'),
          discriminacao,
          entrada: `R$ ${truncateToTwoDecimals(parseFloat(t.quantia) || 0)}`,
          saida: '-',
          data: t.data
        });
      }
      // Entradas normais agrupadas
      else {
        if (!grouped[day]) grouped[day] = { D: 0, O: 0 };
        if (t.tipo === 'D') grouped[day].D += parseFloat(t.quantia) || 0;
        else if (t.tipo === 'O') grouped[day].O += parseFloat(t.quantia) || 0;
      }
    });
    
    let formattedData = [];
    
    // Adicionar agrupadas
    Object.keys(grouped).forEach(day => {
      if (grouped[day].D > 0) {
        formattedData.push({ 
          dia: day.padStart(2, '0'), 
          discriminacao: 'Dízimo', 
          entrada: `R$ ${truncateToTwoDecimals(grouped[day].D)}`, 
          saida: '-',
          data: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day}`
        });
      }
      if (grouped[day].O > 0) {
        formattedData.push({ 
          dia: day.padStart(2, '0'), 
          discriminacao: 'Oferta', 
          entrada: `R$ ${truncateToTwoDecimals(grouped[day].O)}`, 
          saida: '-',
          data: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day}`
        });
      }
    });
    
    // Adicionar individuais
    formattedData = formattedData.concat(individuais);
    
    // Ordenar por data
    formattedData.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    return formattedData.map(row => [row.dia, row.discriminacao, row.entrada, row.saida]);
  }
  }

  return (
    <div className="relatorio-pdf-preview-responsive" style={{ width: '100%', height: 500, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', background: '#fff', position: 'relative' }}>
      <iframe ref={iframeRef} title="Simulação do PDF do Relatório" width="100%" height="100%" style={{ border: 'none' }} />
    </div>
  );
};

export default RelatorioPdfSimulado;
