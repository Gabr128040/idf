import React, { useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo.png';
import { truncateToTwoDecimals, getTipoDespesaDisplay, getLastDayOfMonth } from '../utils';

function getFormattedTableData(transactions, currentMonth, currentYear, previewData, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja) {
  // Filtrar transações do mês/ano atual
  let baseTransacoes = transactions.filter(t => {
    const [ano, mes] = t.data.split('-');
    return parseInt(mes) === currentMonth && parseInt(ano) === currentYear;
  });

  // Simular transações extras (apenas para prévia)
  const lastDayOfMonth = getLastDayOfMonth(currentYear, currentMonth);
  let transacoesExtras = [];
  if (includeGratificacao) {
    transacoesExtras.push({
      tipo: 'S', tipo_despesa: 'OT', descricao: 'Gratificação do Líder', quantia: 900, data: lastDayOfMonth
    });
  }
  if (includeDizimoGratificacao) {
    transacoesExtras.push({
      tipo: 'D', descricao: 'Dízimo da Gratificação', quantia: 90, data: lastDayOfMonth
    });
  }
  if (includeDizimoIgreja && previewData) {
    transacoesExtras.push({
      tipo: 'S', tipo_despesa: 'OT', descricao: 'Dízimo da Igreja', quantia: previewData.dizimoIgreja, data: lastDayOfMonth
    });
  }

  // Agrupar dízimos por dia
  const groupedDizimos = baseTransacoes
    .filter(t => t.tipo === 'D')
    .reduce((acc, t) => {
      const day = t.data ? t.data.split('-')[2] : '';
      if (!acc[day]) acc[day] = 0;
      acc[day] += parseFloat(t.quantia) || 0;
      return acc;
    }, {});

  // Adicionar os dízimos agrupados ao formattedData
  let formattedData = [];
  Object.keys(groupedDizimos).forEach(day => {
    formattedData.push({
      dia: day.padStart(2, '0'),
      discriminacao: 'Dízimo',
      entrada: `R$ ${truncateToTwoDecimals(groupedDizimos[day])}`,
      saida: '-',
      isExtra: false
    });
  });

  // Adicionar as outras transações (não-dízimos) ao formattedData
  baseTransacoes
    .filter(t => t.tipo !== 'D')
    .forEach(transaction => {
      const day = transaction.data ? transaction.data.split('-')[2] : '';
      let discriminacao = '';
      if (transaction.tipo === 'O') {
        discriminacao = 'Oferta';
      } else if (transaction.tipo === 'S') {
        const tipoDespesa = getTipoDespesaDisplay(transaction.tipo_despesa);
        discriminacao = tipoDespesa === 'Outro' ? (transaction.descricao || 'Outro') : tipoDespesa;
      }
      formattedData.push({
        dia: day.padStart(2, '0'),
        discriminacao,
        entrada: transaction.tipo === 'O' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-',
        saida: transaction.tipo === 'S' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-',
        isExtra: false
      });
    });

  // Ordenar todas as transações normais por dia (mais antiga para mais recente)
  formattedData.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

  // Adicionar as transações extras (simuladas) ao final
  transacoesExtras.forEach(transaction => {
    let discriminacao = '';
    if (transaction.tipo === 'D') {
      discriminacao = 'Dízimo da Gratificação';
    } else if (transaction.tipo === 'S') {
      discriminacao = transaction.descricao || 'Despesa';
    }
    formattedData.push({
      dia: transaction.data ? transaction.data.split('-')[2] : '',
      discriminacao,
      entrada: transaction.tipo === 'D' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-',
      saida: transaction.tipo === 'S' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-',
      isExtra: true
    });
  });

  // Adicionar 5 linhas vazias ao final
  for (let i = 0; i < 5; i++) {
    formattedData.push({ dia: '', discriminacao: '', entrada: '', saida: '', isExtra: false });
  }

  return formattedData;
}

// Componente de pré-visualização do PDF do relatório
const RelatorioPdfPreview = ({ previewData, currentMonth, currentYear, transactions, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja }) => {
  const iframeRef = useRef();

  useEffect(() => {
    if (!previewData) return;
    const pdfMonth = currentMonth;
    const pdfYear = currentYear;
    const formattedData = getFormattedTableData(transactions || [], pdfMonth, pdfYear, previewData, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja);
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
    doc.text(`MÊS: ${new Date(0, pdfMonth - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}`, 10, 35);
    doc.text(`ANO: ${pdfYear}`, 105, 35, { align: 'center' });
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
    const finalY = doc.lastAutoTable.finalY - 5;
    const infoBoxX = 10;
    const infoBoxY = finalY + 10;
    const infoBoxWidth = 180;
    const infoBoxHeight = 25;
    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240);
    doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 'FD');
    const infoStartX = infoBoxX + 5;
    let infoStartY = infoBoxY + 4;
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.text('TOTAL DE ENTRADA:', infoStartX, infoStartY);
    doc.text(`R$ ${truncateToTwoDecimals(previewData.totalEntradas)}`, infoStartX + 60, infoStartY);
    infoStartY += 4;
    doc.text('TOTAL DE SAÍDA DO MÊS:', infoStartX, infoStartY);
    doc.text(`R$ ${truncateToTwoDecimals(previewData.totalSaidas)}`, infoStartX + 60, infoStartY);
    infoStartY += 4;
    doc.text('SALDO DO MÊS:', infoStartX, infoStartY);
    doc.text(`R$ ${previewData.saldoMes.toFixed(2)}`, infoStartX + 60, infoStartY);
    infoStartY += 4;
    doc.text('SALDO ANTERIOR:', infoStartX, infoStartY);
    doc.text(`R$ ${previewData.saldoAnterior.toFixed(2)}`, infoStartX + 60, infoStartY);
    infoStartY += 4;
    doc.text('TOTAL EM CAIXA:', infoStartX, infoStartY);
    const totalEmCaixa = previewData.saldoFinal;
    doc.text(`R$ ${truncateToTwoDecimals(totalEmCaixa)}`, infoStartX + 60, infoStartY);
    const signatureY = infoBoxY + infoBoxHeight + 6;
    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.text('TESOUREIRO: ______________________________', 10, signatureY);
    doc.text('DIRIGENTE DA CONGREGAÇÃO: ______________________________', 10, signatureY + 5);
    doc.text('DIRETOR FINANCEIRO IDM SEDE: ______________________________', 10, signatureY + 10);
    doc.text('CONSELHO FISCAL: ______________________________', 10, signatureY + 15);
    // Gera o PDF como blob e exibe no iframe
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
    // Limpa o objeto URL ao desmontar
    return () => URL.revokeObjectURL(url);
  }, [previewData, currentMonth, currentYear, transactions]);

  return (
    <div style={{ width: '100%', height: 500, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <iframe
        ref={iframeRef}
        title="Prévia do PDF do Relatório"
        width="100%"
        height="100%"
        style={{ border: 'none' }}
      />
    </div>
  );
};

export default RelatorioPdfPreview;
