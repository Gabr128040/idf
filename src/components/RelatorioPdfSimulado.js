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

  // Função igual à do RelatorioPdfPreview
  function getFormattedTableData(transactions, currentMonth, currentYear, previewData, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja) {
    let baseTransacoes = transactions.filter(t => {
      const [ano, mes] = t.data.split('-');
      return parseInt(mes) === currentMonth && parseInt(ano) === currentYear;
    });
    const lastDayOfMonth = getLastDayOfMonth(currentYear, currentMonth);
    let transacoesExtras = [];
    if (includeGratificacao) {
      transacoesExtras.push({ tipo: 'S', tipo_despesa: 'OT', descricao: 'Gratificação do Líder', quantia: 900, data: lastDayOfMonth });
    }
    if (includeDizimoGratificacao) {
      transacoesExtras.push({ tipo: 'D', descricao: 'Dízimo da Gratificação', quantia: 90, data: lastDayOfMonth });
    }
    if (includeDizimoIgreja && previewData) {
      transacoesExtras.push({ tipo: 'S', tipo_despesa: 'OT', descricao: 'Dízimo da Igreja', quantia: previewData.dizimoIgreja, data: lastDayOfMonth });
    }
    const groupedDizimos = baseTransacoes.filter(t => t.tipo === 'D').reduce((acc, t) => {
      const day = t.data ? t.data.split('-')[2] : '';
      if (!acc[day]) acc[day] = 0;
      acc[day] += parseFloat(t.quantia) || 0;
      return acc;
    }, {});
    let formattedData = [];
    Object.keys(groupedDizimos).forEach(day => {
      formattedData.push({ dia: day.padStart(2, '0'), discriminacao: 'Dízimo', entrada: `R$ ${truncateToTwoDecimals(groupedDizimos[day])}`, saida: '-', isExtra: false });
    });
    baseTransacoes.filter(t => t.tipo !== 'D').forEach(transaction => {
      const day = transaction.data ? transaction.data.split('-')[2] : '';
      let discriminacao = '';
      if (transaction.tipo === 'O') {
        discriminacao = 'Oferta';
      } else if (transaction.tipo === 'S') {
        const tipoDespesa = getTipoDespesaDisplay(transaction.tipo_despesa);
        discriminacao = tipoDespesa === 'Outro' ? (transaction.descricao || 'Outro') : tipoDespesa;
      }
      formattedData.push({ dia: day.padStart(2, '0'), discriminacao, entrada: transaction.tipo === 'O' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-', saida: transaction.tipo === 'S' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-', isExtra: false });
    });
    formattedData.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));
    transacoesExtras.forEach(transaction => {
      let discriminacao = '';
      if (transaction.tipo === 'D') {
        discriminacao = 'Dízimo da Gratificação';
      } else if (transaction.tipo === 'S') {
        discriminacao = transaction.descricao || 'Despesa';
      }
      formattedData.push({ dia: transaction.data ? transaction.data.split('-')[2] : '', discriminacao, entrada: transaction.tipo === 'D' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-', saida: transaction.tipo === 'S' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-', isExtra: true });
    });
    for (let i = 0; i < 5; i++) {
      formattedData.push({ dia: '', discriminacao: '', entrada: '', saida: '', isExtra: false });
    }
    return formattedData;
  }

  return (
    <div className="relatorio-pdf-preview-responsive" style={{ width: '100%', height: 500, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', background: '#fff', position: 'relative' }}>
      <iframe ref={iframeRef} title="Simulação do PDF do Relatório" width="100%" height="100%" style={{ border: 'none' }} />
    </div>
  );
};

export default RelatorioPdfSimulado;
