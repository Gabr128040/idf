import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTransactions, fetchSaldo, deleteTransaction, setupAxiosInterceptors, simularFechamento } from '../api/transactions';
import { verificarFechamento } from '../api/fechamento';
import SmartCalculator from '../components/SmartCalculator';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import EditTransactionModal from '../components/EditTransactionModal';
import SaldoIndicator from '../components/SaldoIndicator';
import ConfirmationModal from '../components/ConfirmationModal';
import Notification from '../components/Notification';
import Navbar from '../components/Navbar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion } from 'framer-motion';


import axiosLocal from 'axios';
import logo from '../assets/logo.png';
import './Dashboard.css';
import { getTipoDespesaDisplay, getLastDayOfMonth } from '../utils';
import { FaPlus, FaFileAlt } from 'react-icons/fa';
import RelatorioPdfInterativo from '../components/RelatorioPdfInterativo';
import ModalBase from '../components/ModalBase';
import Tooltip from '../components/Tooltip';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchDay, setSearchDay] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [searchType, setSearchType] = useState('');
  // Advanced filter states
  const [generalSearch, setGeneralSearch] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [igrejaUsuario, setIgrejaUsuario] = useState(null);
  const [saldoMensal, setSaldoMensal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [includeGratificacao, setIncludeGratificacao] = useState(false);
  const [includeDizimoGratificacao, setIncludeDizimoGratificacao] = useState(false);
  const [includeDizimoIgreja, setIncludeDizimoIgreja] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isGratificacaoEnabled, setIsGratificacaoEnabled] = useState(true);
  const [valorGratificacao, setValorGratificacao] = useState(900);
  const [viewMode, setViewMode] = useState('lista'); // 'lista', 'pdf'
  // Estado para loading de ações
  const [actionLoading, setActionLoading] = useState(false);
  // Estado para saldo do mês anterior
  const [saldoAnterior, setSaldoAnterior] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showFiltroModal, setShowFiltroModal] = useState(false);
  // Adicione um estado para loading da tabela
  const [tableLoading, setTableLoading] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    setupAxiosInterceptors(navigate);
  }, [navigate]);

  // Totais rápidos para mini-cards (baseado nas transações filtradas)
  const calculateTotals = (list) => {
    let entradas = 0;
    let saidas = 0;
    (list || []).forEach(t => {
      const q = Number(t.quantia || 0);
      if (t.tipo === 'D' || t.tipo === 'O') entradas += q;
      else saidas += q;
    });
    return { entradas, saidas };
  };
  const { entradas: totalEntradas, saidas: totalSaidas } = calculateTotals(filteredTransactions);

  // Efeito visual: aplicar pulso no dashboard-top quando pulseKey mudar
  useEffect(() => {
    if (!pulseKey) return;
    const el = document.getElementById('dashboard-top');
    if (!el) return;
    el.classList.add('pulse-highlight');
    const t = setTimeout(() => el.classList.remove('pulse-highlight'), 950);
    return () => clearTimeout(t);
  }, [pulseKey]);

  const updateTransactions = async () => {
    try {
      const transData = await fetchTransactions(selectedMonth || null, selectedYear, navigate, igrejaUsuario ? igrejaUsuario.id : null);
      setTransactions(transData);
      setFilteredTransactions(transData);
      setCurrentPage(1);
    } catch (err) {
      setNotification({ message: 'Erro ao atualizar transações: ' + err.message, type: 'error' });
    }
  };

  const updateSaldo = async () => {
    try {
      // Para o indicador de saldo, usamos o saldo atual (todas as transações)
      const saldoData = await fetchSaldo(navigate, igrejaUsuario ? igrejaUsuario.id : null, null, null, 'atual');
      setSaldo(saldoData);
    } catch (err) {
      setNotification({ message: 'Erro ao atualizar saldo: ' + err.message, type: 'error' });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transData, saldoData] = await Promise.all([
        fetchTransactions(selectedMonth || null, selectedYear, navigate, igrejaUsuario ? igrejaUsuario.id : null),
        fetchSaldo(navigate, igrejaUsuario ? igrejaUsuario.id : null),
      ]);
      setTransactions(transData);
      setFilteredTransactions(transData);
      setSaldo(saldoData);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (igrejaUsuario) {
      fetchData();
    }
    // eslint-disable-next-line
  }, [selectedMonth, selectedYear, igrejaUsuario]);

  // Enhanced filtering logic with advanced filters
  useEffect(() => {
    let filtered = [...transactions];

    // General search - searches across multiple fields
    if (generalSearch) {
      const searchTerm = generalSearch.toLowerCase();
      filtered = filtered.filter((t) => {
        const description = (t.descricao || '').toLowerCase();
        const discriminacao = (t.discriminacao || '').toLowerCase();
        const nome = (t.nome || '').toLowerCase();
        const amount = (t.quantia || '').toString();
        const day = t.data ? t.data.split('-')[2] : '';
        
        return description.includes(searchTerm) ||
               discriminacao.includes(searchTerm) ||
               nome.includes(searchTerm) ||
               amount.includes(searchTerm) ||
               day.includes(searchTerm);
      });
    }
    
    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter((t) => {
        if (!t.data) return false;
        return new Date(t.data) >= new Date(dateRangeStart);
      });
    }
    if (dateRangeEnd) {
      filtered = filtered.filter((t) => {
        if (!t.data) return false;
        return new Date(t.data) <= new Date(dateRangeEnd);
      });
    }
    
    // Legacy filters (keep for backward compatibility)
    if (searchDay) {
      filtered = filtered.filter((t) => {
        if (!t.data) return false;
        const day = t.data.split('-')[2];
        return day === searchDay.padStart(2, '0');
      });
    }
    if (searchDescription) {
      filtered = filtered.filter((t) => (t.descricao || '').toLowerCase().includes(searchDescription.toLowerCase()));
    }
    if (searchType) {
      filtered = filtered.filter((t) => t.tipo === searchType);
    }
    
    // Ordenar do mais recente para o mais antigo
    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));
    setFilteredTransactions(filtered);
  }, [generalSearch, dateRangeStart, dateRangeEnd, searchDay, searchDescription, searchType, transactions]);

  // Atualiza transações e saldo, fecha modais após ações
  const handleTransactionAdded = async () => {
    setActionLoading(true);
    await updateTransactions();
    await updateSaldo();
    setShowForm(false);
    setActionLoading(false);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
  };

  const handleSave = async () => {
    setActionLoading(true);
    await updateTransactions();
    await updateSaldo();
    setEditingTransaction(null);
    setActionLoading(false);
    setNotification({ message: 'Transação editada com sucesso!', type: 'success' });
  };

  // const handleDelete = (transaction) => {
  //   setTransactionToDelete(transaction);
  //   setIsModalOpen(true);
  // };

  const confirmDelete = async () => {
    if (!selectedTransaction) return;
    setActionLoading(true);
    try {
      await deleteTransaction(selectedTransaction.id, navigate);
      setNotification({ message: 'Transação excluída com sucesso!', type: 'success' });
      setSelectedTransaction(null);
      await updateTransactions();
      await updateSaldo();
    } catch (err) {
      setNotification({ message: 'Erro ao excluir transação: ' + err.message, type: 'error' });
      setSelectedTransaction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGratificacaoChange = (value) => {
    setIncludeGratificacao(value);
    if (!value) {
      setIncludeDizimoGratificacao(false);
      setIncludeDizimoIgreja(false);
    }
  };

  const { truncateToTwoDecimals } = require('../utils');

  // Função para formatar os dados da tabela do PDF
  function getFormattedTableData(transacoes, currentMonth, currentYear) {
    return transacoes
      .filter(t => {
        const [ano, mes] = t.data.split('-');
        return parseInt(mes) === currentMonth && parseInt(ano) === currentYear;
      })
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .map(t => ({
        dia: t.data.split('-')[2],
        discriminacao: t.descricao || '-',
        entrada: (t.tipo === 'D' || t.tipo === 'O') ? truncateToTwoDecimals(t.quantia) : '-',
        saida: t.tipo === 'S' ? truncateToTwoDecimals(t.quantia) : '-',
      }));
  }

  // Função para gerar PDF de prévia simulada (sem salvar no sistema)
  const generatePdfPreview = () => {
    if (!previewData) return;

    const pdfMonth = currentMonth;
    const pdfYear = currentYear;
    const lastDayOfMonth = getLastDayOfMonth(pdfYear, pdfMonth);
    
    // Filtrar transações do mês/ano atual
    let baseTransacoes = transactions.filter(t => {
      const [ano, mes] = t.data.split('-');
      return parseInt(mes) === currentMonth && parseInt(ano) === currentYear;
    });

    // Simular transações extras (apenas para prévia - NÃO criar no sistema)
    let transacoesExtras = [];
    if (includeGratificacao) {
      transacoesExtras.push({
        tipo: 'S', descricao: 'Gratificação do Líder', quantia: Number(valorGratificacao), data: lastDayOfMonth, nao_agrupar: true
      });
    }
    if (includeDizimoGratificacao) {
      transacoesExtras.push({
        tipo: 'D', descricao: 'Dízimo da Gratificação', quantia: 90, data: lastDayOfMonth, nao_agrupar: false
      });
    }
    if (includeDizimoIgreja && previewData) {
      transacoesExtras.push({
        tipo: 'S', descricao: 'Dízimo da Igreja', quantia: previewData.dizimoIgreja, data: lastDayOfMonth, nao_agrupar: true
      });
    }

    // Combinar transações reais com simuladas
    const todasTransacoes = [...baseTransacoes, ...transacoesExtras];
    
    // Separar agrupadas e individuais (mesma lógica do relatório oficial)
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
      // Transações tipo "outro" sempre individuais (culto = 'OT')
      else if (t.culto === 'OT' || t.tipo_despesa === 'OT') {
        individuais.push({
          dia: day.padStart(2, '0'),
          discriminacao: t.descricao || 'Outro',
          entrada: (t.tipo === 'D' || t.tipo === 'O') ? `R$ ${truncateToTwoDecimals(parseFloat(t.quantia) || 0)}` : '-',
          saida: t.tipo === 'S' ? `R$ ${truncateToTwoDecimals(parseFloat(t.quantia) || 0)}` : '-',
          data: t.data
        });
      }
      // Dízimos e ofertas com discriminação sempre individuais
      else if ((t.tipo === 'D' || t.tipo === 'O') && t.descricao && t.descricao.trim()) {
        individuais.push({
          dia: day.padStart(2, '0'),
          discriminacao: t.descricao,
          entrada: `R$ ${truncateToTwoDecimals(parseFloat(t.quantia) || 0)}`,
          saida: '-',
          data: t.data
        });
      }
      // Entradas normais SEM discriminação - podem ser agrupadas
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
    
    // Adicionar 5 linhas vazias ao final
    for (let i = 0; i < 5; i++) {
      formattedData.push({ dia: '', discriminacao: '', entrada: '', saida: '' });
    }

    // Gerar o PDF
    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    
    // Adicionar logo
    try {
      doc.addImage(logo, 'PNG', 10, 10, 15, 15);
    } catch (err) {
      console.warn('Erro ao adicionar logotipo:', err);
    }
    
    // Cabeçalho
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
    
    // Adicionar marca d'água "PRÉVIA"
    doc.setFont('times', 'bold');
    doc.setFontSize(60);
    doc.setTextColor(220, 220, 220);
    doc.text('PRÉVIA', 105, 150, { align: 'center', angle: 45 });
    doc.setTextColor(0, 0, 0);
    
    // Tabela
    autoTable(doc, {
      startY: 40,
      head: [['DIA', 'DISCRIMINAÇÃO', 'ENTRADA', 'SAÍDA']],
      body: formattedData.map(row => [row.dia, row.discriminacao, row.entrada !== undefined ? row.entrada : '-', row.saida !== undefined ? row.saida : '-']),
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 80 }, 2: { cellWidth: 40, halign: 'right' }, 3: { cellWidth: 40, halign: 'right' } },
    });
    
    // Caixa de informações
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
      doc.text('SALDO ANTERIOR:', infoStartX, infoStartY);
      doc.text(`R$ ${truncateToTwoDecimals(previewData.saldoAnterior)}`, infoStartX + 60, infoStartY);
      infoStartY += 4;
      doc.text('SALDO DO MÊS:', infoStartX, infoStartY);
      doc.text(`R$ ${truncateToTwoDecimals(previewData.saldoMes)}`, infoStartX + 60, infoStartY);
      infoStartY += 4;
      doc.text('TOTAL EM CAIXA:', infoStartX, infoStartY);
      doc.text(`R$ ${truncateToTwoDecimals(previewData.saldoFinal)}`, infoStartX + 60, infoStartY);    // Linhas de assinatura
    const signatureY = infoBoxY + infoBoxHeight + 6;
    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.text('TESOUREIRO: ______________________________', 10, signatureY);
    doc.text('DIRIGENTE DA CONGREGAÇÃO: ______________________________', 10, signatureY + 5);
    doc.text('DIRETOR FINANCEIRO IDM SEDE: ______________________________', 10, signatureY + 10);
    doc.text('CONSELHO FISCAL: ______________________________', 10, signatureY + 15);
    
    // Baixar o PDF
    doc.save(`previa_relatorio_${pdfMonth}_${pdfYear}.pdf`);
  };

  // Função para gerar e salvar o PDF detalhado
  const generateMonthlyReport = async () => {
    setIsLoading(true);
    setShowReportModal(false); // Fecha o modal antes de mostrar a animação

    // Mostra a animação de geração de PDF
    const pdfAnimation = document.createElement('div');
    pdfAnimation.className = 'pdf-generation-overlay';
    pdfAnimation.innerHTML = `
      <div class="pdf-generation-content">
        <div class="pdf-animation">
          <div class="pdf-page"></div>
          <div class="math-symbols">
            <span class="entrada">+</span>
            <span class="saida">−</span>
          </div>
          <div class="lines">
            <div class="line"></div>
            <div class="line"></div>
            <div class="line"></div>
          </div>
          <div class="status-text">Gerando relatório...</div>
        </div>
      </div>
    `;
    document.body.appendChild(pdfAnimation);

    try {
      const pdfMonth = currentMonth;
      const pdfYear = currentYear;
      const lastDayOfMonth = getLastDayOfMonth(pdfYear, pdfMonth);
      let extrasCriadas = [];
      // Criar oficialmente no sistema as transações extras, se marcadas
      if (includeGratificacao) {
        if (!valorGratificacao) {
          setNotification({ message: 'Por favor, insira um valor para a gratificação do líder.', type: 'error' });
          return;
        }
        const gratificacaoTransacao = {
          tipo: 'S', tipo_despesa: 'OT', descricao: 'Gratificação do Líder', quantia: Number(valorGratificacao), data: lastDayOfMonth, igreja_id: igrejaUsuario?.id
        };
        await axiosLocal.post(`${process.env.REACT_APP_API_URL}/api/transacoes/nova/`, gratificacaoTransacao);
        extrasCriadas.push(gratificacaoTransacao);
      }
      if (includeDizimoGratificacao) {
        const dizimoGratificacaoTransacao = {
          tipo: 'D', descricao: 'Dízimo da Gratificação', quantia: 90, data: lastDayOfMonth, igreja_id: igrejaUsuario?.id
        };
        await axiosLocal.post(`${process.env.REACT_APP_API_URL}/api/transacoes/nova/`, dizimoGratificacaoTransacao);
        extrasCriadas.push(dizimoGratificacaoTransacao);
      }
      if (includeDizimoIgreja && previewData) {
        const dizimoIgrejaTransacao = {
          tipo: 'S',
          tipo_despesa: 'OT',
          descricao: 'Dízimo da Igreja',
          quantia: Number(truncateToTwoDecimals(previewData.dizimoIgreja)),
          data: lastDayOfMonth,
          igreja_id: igrejaUsuario?.id ? Number(igrejaUsuario.id) : undefined
        };
        console.log('Enviando transação Dízimo da Igreja:', dizimoIgrejaTransacao);
        try {
          await axiosLocal.post(`${process.env.REACT_APP_API_URL}/api/transacoes/nova/`, dizimoIgrejaTransacao);
          extrasCriadas.push(dizimoIgrejaTransacao);
        } catch (err) {
          console.error('Erro ao criar Dízimo da Igreja:', err?.response?.data || err);
          setNotification({ message: 'Erro ao criar Dízimo da Igreja: ' + (err?.response?.data?.error || err.message), type: 'error' });
        }
      }
      // Buscar transações atualizadas após criar extras
      const transacoesAtualizadas = await fetchTransactions(pdfMonth, pdfYear, navigate, igrejaUsuario ? igrejaUsuario.id : null);
      // Agrupar dízimos e ofertas por dia (apenas os que não têm nao_agrupar = true)
      const grouped = {};
      const individuais = [];
      
      transacoesAtualizadas.forEach(t => {
        const [ano, mes, dia] = t.data.split('-');
        
        // Saídas sempre vão para individuais
        if (t.tipo === 'S') {
          individuais.push({
            dia,
            discriminacao: t.descricao || 'Despesa',
            entrada: '-',
            saida: `R$ ${truncateToTwoDecimals(parseFloat(t.quantia))}`,
            data: t.data
          });
        }
        // Entradas marcadas com nao_agrupar também vão para individuais
        else if (t.nao_agrupar === true) {
          const tipoNome = t.tipo === 'D' ? 'Dízimo' : 'Oferta';
          const discriminacao = t.descricao || tipoNome;
          individuais.push({
            dia,
            discriminacao,
            entrada: `R$ ${truncateToTwoDecimals(parseFloat(t.quantia))}`,
            saida: '-',
            data: t.data
          });
        }
        // Transações tipo "outro" sempre individuais (culto = 'OT')
        else if (t.culto === 'OT' || t.tipo_despesa === 'OT') {
          individuais.push({
            dia,
            discriminacao: t.descricao || 'Outro',
            entrada: (t.tipo === 'D' || t.tipo === 'O') ? `R$ ${truncateToTwoDecimals(parseFloat(t.quantia))}` : '-',
            saida: t.tipo === 'S' ? `R$ ${truncateToTwoDecimals(parseFloat(t.quantia))}` : '-',
            data: t.data
          });
        }
        // Dízimos e ofertas com discriminação sempre individuais
        else if ((t.tipo === 'D' || t.tipo === 'O') && t.descricao && t.descricao.trim()) {
          individuais.push({
            dia,
            discriminacao: t.descricao,
            entrada: `R$ ${truncateToTwoDecimals(parseFloat(t.quantia))}`,
            saida: '-',
            data: t.data
          });
        }
        // Entradas normais SEM discriminação - podem ser agrupadas
        else {
          if (!grouped[dia]) grouped[dia] = { D: 0, O: 0 };
          if (t.tipo === 'D') grouped[dia].D += parseFloat(t.quantia);
          else if (t.tipo === 'O') grouped[dia].O += parseFloat(t.quantia);
        }
      });
      
      // Montar formattedData com agrupados + individuais
      let formattedData = [];
      
      // Adicionar transações agrupadas
      Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b)).forEach(dia => {
        if (grouped[dia].D > 0) {
          formattedData.push({ 
            dia, 
            discriminacao: 'Dízimo', 
            entrada: `R$ ${truncateToTwoDecimals(grouped[dia].D)}`, 
            saida: '-',
            data: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${dia}`
          });
        }
        if (grouped[dia].O > 0) {
          formattedData.push({ 
            dia, 
            discriminacao: 'Oferta', 
            entrada: `R$ ${truncateToTwoDecimals(grouped[dia].O)}`, 
            saida: '-',
            data: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${dia}`
          });
        }
      });
      
      // Adicionar transações individuais
      formattedData = formattedData.concat(individuais);
      
      // Ordenar por data
      formattedData.sort((a, b) => new Date(a.data) - new Date(b.data));
      // Adicionar 5 linhas vazias ao final
      for (let i = 0; i < 5; i++) {
        formattedData.push({ dia: '', discriminacao: '', entrada: '', saida: '' });
      }
      // Gerar o PDF
      const doc = new jsPDF({ format: 'a4', unit: 'mm' });
      try {
        doc.addImage(logo, 'PNG', 10, 10, 15, 15);
      } catch (err) {
        setNotification({ message: 'Erro ao adicionar o logotipo ao PDF. Verifique o arquivo da imagem.', type: 'error' });
      }
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
      doc.text('SALDO ANTERIOR:', infoStartX, infoStartY);
      doc.text(`R$ ${previewData.saldoAnterior.toFixed(2)}`, infoStartX + 60, infoStartY);
      infoStartY += 4;
      doc.text('SALDO DO MÊS:', infoStartX, infoStartY);
      doc.text(`R$ ${previewData.saldoMes.toFixed(2)}`, infoStartX + 60, infoStartY);
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
      // Salvar PDF localmente
      doc.save(`relatorio_financeiro_${pdfMonth}_${pdfYear}.pdf`);
      // Enviar PDF para o backend
      const saveRelatorio = async (nome, mes, ano, pdfBlob) => {
        const formData = new FormData();
        formData.append('nome', nome);
        formData.append('mes', mes);
        formData.append('ano', ano);
        formData.append('arquivo', pdfBlob);
        try {
          const response = await axiosLocal.post(`${process.env.REACT_APP_API_URL}/api/relatorios/salvar/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setNotification({ message: 'Relatório salvo com sucesso!', type: 'success' });
        } catch (error) {
          setNotification({ message: 'Erro ao salvar relatório: ' + error.message, type: 'error' });
        }
      };
      const pdfBlob = doc.output('blob');
      await saveRelatorio(`relatorio_${pdfMonth}_${pdfYear}.pdf`, pdfMonth, pdfYear, pdfBlob);
      await updateTransactions();
    } catch (err) {
      setNotification({ message: 'Erro ao gerar o relatório: ' + err.message, type: 'error' });
    } finally {
      setIsLoading(false);
      // Remove a animação após a geração do PDF
      const overlay = document.querySelector('.pdf-generation-overlay');
      if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(async () => {
          overlay.remove();
          // Atualiza o dashboard após remover a animação
          await Promise.all([
            updateTransactions(),
            updateSaldo()
          ]);
          setPulseKey(k => k + 1); // Pulso visual para indicar atualização
        }, 300);
      }
    }
  };

  // Buscar perfil do usuário autenticado ao montar o Dashboard
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await axiosLocal.get(`${process.env.REACT_APP_API_URL}/api/me/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIgrejaUsuario(response.data.igreja || null);
      } catch (err) {
        setIgrejaUsuario(null);
        setNotification({ message: 'Erro ao buscar perfil do usuário: ' + (err.response?.data?.detail || err.message), type: 'error' });
      }
    };
    fetchUserProfile();
  }, []);

  // Sempre use o mês e ano atual para relatórios e cálculos
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Janeiro = 0
  const currentYear = currentDate.getFullYear();

  // Buscar saldo do mês anterior ao abrir o modal de relatório
  useEffect(() => {
    if (!showReportModal || !igrejaUsuario) return;
    
    // Verifica se o mês já está fechado
    const checkFechamento = async () => {
      try {
        const dados = await verificarFechamento(igrejaUsuario.id, currentMonth, currentYear);
        setSaldoMensal(dados);
      } catch (err) {
        console.error('Erro ao verificar fechamento:', err);
        setSaldoMensal(null);
      }
    };
    checkFechamento();
    let mes = currentMonth - 1;
    let ano = currentYear;
    if (mes < 1) {
      mes = 12;
      ano--;
    }
    const fetchSaldoAnterior = async () => {
      try {
        // Busca o total em caixa até o fim do mês anterior
        const saldoAnt = await fetchSaldo(navigate, igrejaUsuario.id, mes, ano, 'ate_mes');
        setSaldoAnterior(saldoAnt);
      } catch {
        setSaldoAnterior(0);
      }
    };
    fetchSaldoAnterior();
  }, [showReportModal, igrejaUsuario, currentMonth, currentYear]);

  // Atualiza a prévia do relatório sempre que filtros ou opções mudam
  useEffect(() => {
    const atualizarPreviewData = async () => {
      try {
        // Filtra as transações do mês/ano atual
        let transacoesMes = transactions.filter(t => {
          const [ano, mes] = t.data.split('-');
          return parseInt(mes) === currentMonth && parseInt(ano) === currentYear;
        });

        // 1. Entradas regulares do mês (ofertas + dízimos)
        let entradasRegulares = transacoesMes
          .filter(t => t.tipo === 'D' || t.tipo === 'O')
          .reduce((acc, t) => acc + Number(t.quantia), 0);

        // 2. Saídas regulares do mês
        let saidasRegulares = transacoesMes
          .filter(t => t.tipo === 'S')
          .reduce((acc, t) => acc + Number(t.quantia), 0);

        // 3. Dízimo da gratificação (se marcado)
        let dizimoGratificacao = includeDizimoGratificacao ? Number(valorGratificacao) * 0.1 : 0;

        // 4. Gratificação (se marcada)
        let gratificacao = includeGratificacao ? Number(valorGratificacao) : 0;

        // 5. Total de entradas do mês (regulares + dízimo da gratificação se marcado)
        let totalEntradas = entradasRegulares + (includeDizimoGratificacao ? dizimoGratificacao : 0);

        // 6. Dízimo da igreja (se marcado)
        let dizimoIgreja = includeDizimoIgreja ? totalEntradas * 0.1 : 0;

        // 7. Total de saídas do mês (regulares + gratificação + dízimo da igreja se marcados)
        let totalSaidas = saidasRegulares + 
          (includeGratificacao ? gratificacao : 0) + 
          (includeDizimoIgreja ? dizimoIgreja : 0);

        // 8. Saldo do mês (entradas - saídas)
        let saldoMes = totalEntradas - totalSaidas;

        // 9. Total em caixa após todas as operações
        let saldoFinal = saldoAnterior + saldoMes;

        setPreviewData({
          totalEntradas,
          totalSaidas,
          saldoMes,
          saldoAnterior, // Total em caixa até o fim do mês anterior
          saldoFinal,   // Total em caixa após todas as operações do mês
          dizimoIgreja,
          dizimoGratificacao,
          gratificacao,
        });

      } catch (error) {
        console.error('Erro ao atualizar preview:', error);
        setNotification({
          message: 'Erro ao calcular valores: ' + error.message,
          type: 'error'
        });
      }
    };

    if (igrejaUsuario?.id) {
      atualizarPreviewData();
    }
  }, [
    transactions,
    includeGratificacao,
    includeDizimoGratificacao,
    includeDizimoIgreja,
    saldoAnterior,
    currentMonth,
    currentYear,
    valorGratificacao,
    igrejaUsuario?.id,
    navigate
  ]);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 600);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div>
      <Navbar />
      {isLoading || actionLoading ? (
        <div className="zz-spinner-absolute-center">
          <div className="zz-spinner" />
          <span style={{ color: '#4f8cff', fontWeight: 500, marginTop: 18 }}>Carregando...</span>
          <style>{`
            .zz-spinner-absolute-center {
              position: fixed;
              top: 0; left: 0; width: 100vw; height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              background: #f7f8fa;
              z-index: 3000;
            }
            .zz-spinner {
              border: 4px solid #e3e9f7;
              border-top: 4px solid #4f8cff;
              border-radius: 50%;
              width: 48px;
              height: 48px;
              animation: zz-spin 0.9s linear infinite;
            }
            @keyframes zz-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          `}</style>
        </div>
      ) : (
        <main className={isMobile ? 'dashboard-main dashboard-main-mobile' : 'dashboard-main'}>
          {isMobile ? (
            // MOBILE: layout moderno, cores, fontes, interações reais
            <>
              {/* Espaço superior reduzido (apenas padding, botão flutuante controla menu) */}
              <div style={{ height: 12 }} />

              {/* Bloco info igreja/mês */}
              <div id="dashboard-top" data-pulse={pulseKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 16px 8px 16px' }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#4f8cff', letterSpacing: 0.1 }}>{igrejaUsuario ? igrejaUsuario.nome : 'Igreja'}</span>
                <span style={{ fontWeight: 500, fontSize: 14, color: '#222' }}>{new Date(0, selectedMonth ? selectedMonth-1 : currentMonth-1).toLocaleString('pt-BR', { month: 'long' })} {selectedYear}</span>
              </div>

              {/* Saldo centralizado com mini-cards */}
                <div className="saldo-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className={`saldo-value ${saldo < 0 ? 'negative' : ''}`}>R$ {saldo?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Saldo atual</div>
                  </div>
                </div>
              </div>              {/* Botões principais (circulares) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                  {/* Nova transação */}
                  <Tooltip text="Nova transação" position="top">
                    <button onClick={() => setShowForm(true)} style={{ width: 54, height: 54, borderRadius: '50%', border: 'none', background: '#4f8cff', boxShadow: '0 2px 8px #4f8cff33', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 0, transition: 'box-shadow 0.2s' }} aria-label="Nova transação">
                      <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#4f8cff"/><path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </Tooltip>
                  {/* Relatório */}
                  <button onClick={() => setShowReportModal(true)} style={{ width: 54, height: 54, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 2px 8px #4f8cff22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f8cff', fontSize: 0, transition: 'box-shadow 0.2s' }} aria-label="Relatório">
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#4f8cff" strokeWidth="2"/><path d="M8 8h8M8 12h8M8 16h4" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                  {/* Relatórios antigos */}
                  <button onClick={() => navigate('/relatorios')} style={{ width: 54, height: 54, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 2px 8px #b18cff22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c4fcf', fontSize: 0, transition: 'box-shadow 0.2s' }} aria-label="Ver Relatórios Antigos">
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#b18cff" strokeWidth="2"/><path d="M12 8v4l3 3" stroke="#b18cff" strokeWidth="2" strokeLinecap="round"/><path d="M12 6v6l4 2" stroke="#b18cff" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                  {/* Calculadora */}
                  <button onClick={() => setShowCalculator(true)} style={{ width: 54, height: 54, borderRadius: '50%', border: 'none', background: '#fff', boxShadow: '0 2px 8px #f9731622', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontSize: 0, transition: 'box-shadow 0.2s' }} aria-label="Abrir Calculadora">
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="#f97316" strokeWidth="2"/>
                      <path d="M7 8h10M7 12h10M7 16h6" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                {/* Seletor de mês horizontal */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  background: '#fff',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <button 
                    onClick={async () => {
                      const newMonth = selectedMonth ? parseInt(selectedMonth) - 1 : currentMonth - 1;
                      if (newMonth >= 1) {
                        setSelectedMonth(String(newMonth));
                      } else {
                        setSelectedMonth('12');
                        setSelectedYear(prev => prev - 1);
                      }
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path d="M15 18l-6-6 6-6" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: '#4f8cff',
                    minWidth: '140px',
                    textAlign: 'center'
                  }}>
                    {new Date(selectedYear, (selectedMonth ? parseInt(selectedMonth) : currentMonth) - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                  </div>
                  <button 
                    onClick={() => {
                      const newMonth = selectedMonth ? parseInt(selectedMonth) + 1 : currentMonth + 1;
                      if (newMonth <= 12) {
                        setSelectedMonth(String(newMonth));
                      } else {
                        setSelectedMonth('1');
                        setSelectedYear(prev => prev + 1);
                      }
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Barra de ferramentas (modos, refresh, filtros) */}
              <div className="dashboard-toolbar-mobile">
                <div className="toolbar-modos-group">
                  <button
                    className={`toolbar-modo-btn${viewMode==='lista' ? ' active' : ''}`}
                    style={{ minWidth: 60, maxWidth: 100, flex: 1 }}
                    onClick={() => setViewMode('lista')}
                  >
                    {viewMode==='lista' && <span className="toolbar-modo-check">✔</span>}
                    Lista
                  </button>
                  <button
                    className={`toolbar-modo-btn${viewMode==='pdf' ? ' active' : ''}`}
                    style={{ minWidth: 60, maxWidth: 100, flex: 1 }}
                    onClick={() => setViewMode('pdf')}
                  >
                    {viewMode==='pdf' && <span className="toolbar-modo-check">✔</span>}
                    PDF
                  </button>
                </div>
                <div className="toolbar-actions-group">
                  <Tooltip text="Atualizar lista" position="top">
                    <button
                      className={`toolbar-btn-refresh${tableLoading ? ' spinning' : ''}`}
                      onClick={async () => {
                        if (tableLoading) return;
                        setTableLoading(true);
                        await updateTransactions();
                        setTableLoading(false);
                        setPulseKey(k => k + 1);
                      }}
                      title="Atualizar lista"
                    >
                      <span className="toolbar-btn-icon">
                        {/* Seta circular estilo Material/Google */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 5V2L7 6.5L12 11V8C15.31 8 18 10.69 18 14C18 17.31 15.31 20 12 20C8.69 20 6 17.31 6 14H4C4 18.42 7.58 22 12 22C16.42 22 20 18.42 20 14C20 9.58 16.42 6 12 6V5Z" fill="#fff"/></svg>
                      </span>
                    </button>
                  </Tooltip>
                  <Tooltip text="Abrir filtros" position="top">
                    <button
                      className="toolbar-btn-filtros"
                      onClick={() => setShowFiltroModal(true)}
                      title="Filtros"
                    >
                      <span className="toolbar-btn-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 17V15H13V17H3ZM3 13V11H9V13H3ZM3 9V7H17V9H3ZM15 21V19H21V21H15ZM11 5V3H21V5H11Z" fill="#fff"/></svg>
                      </span>
                    </button>
                  </Tooltip>
                </div>
              </div>
              {/* Modal de filtros (usando ModalBase) */}
              {showFiltroModal && (
                <ModalBase isOpen={showFiltroModal} onClose={() => setShowFiltroModal(false)} contentClassName="modalbase-small">
                  <h3 style={{ color: '#6c4fcf', marginBottom: 12 }}>Filtros</h3>
                  {/* Presets rápidos */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button
                      type="button"
                      className="dashboard-preset-btn"
                      onClick={() => {
                        const today = new Date();
                        setSelectedMonth(String(today.getMonth() + 1));
                        setSelectedYear(today.getFullYear());
                        setDateRangeStart('');
                        setDateRangeEnd('');
                        setSearchDay('');
                        setSearchDescription('');
                        setSearchType('');
                      }}
                    >Hoje</button>
                    <button
                      type="button"
                      className="dashboard-preset-btn"
                      onClick={() => {
                        const today = new Date();
                        const past = new Date(); past.setDate(today.getDate() - 6);
                        setDateRangeStart(past.toISOString().slice(0,10));
                        setDateRangeEnd(today.toISOString().slice(0,10));
                        setSelectedMonth('');
                        setSelectedYear(new Date().getFullYear());
                        setSearchDay('');
                        setSearchDescription('');
                        setSearchType('');
                      }}
                    >Últimos 7 dias</button>
                    <button
                      type="button"
                      className="dashboard-preset-btn"
                      onClick={() => {
                        const today = new Date();
                        setSelectedMonth(String(today.getMonth() + 1));
                        setSelectedYear(today.getFullYear());
                        setDateRangeStart('');
                        setDateRangeEnd('');
                        setSearchDay('');
                        setSearchDescription('');
                        setSearchType('');
                      }}
                    >Mês atual</button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label>
                      Mês
                      <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                        <option value="">Todos</option>
                        {[...Array(12)].map((_, i) => (
                          <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Ano
                      <input type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} min="2020" max={new Date().getFullYear()} />
                    </label>
                    <label>
                      Dia
                      <input type="text" value={searchDay} onChange={e => setSearchDay(e.target.value)} placeholder="Ex: 15" />
                    </label>
                    <label>
                      Descrição
                      <input type="text" value={searchDescription} onChange={e => setSearchDescription(e.target.value)} placeholder="Buscar..." />
                    </label>
                    <label>
                      Tipo
                      <select value={searchType} onChange={e => setSearchType(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="D">Dízimo</option>
                        <option value="O">Oferta</option>
                        <option value="S">Despesa</option>
                      </select>
                    </label>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                    <button className="dashboard-btn-primary" onClick={() => { setShowFiltroModal(false); /* aplicar filtros já reflete via estados */ setPulseKey(k => k + 1); }} style={{ minWidth: 90 }}>Aplicar</button>
                    <button className="dashboard-btn-secondary" onClick={() => {
                      setGeneralSearch('');
                      setDateRangeStart('');
                      setDateRangeEnd('');
                      setSearchDay('');
                      setSearchDescription('');
                      setSearchType('');
                      setSelectedMonth('');
                      setSelectedYear(new Date().getFullYear());
                    }} style={{ minWidth: 90 }}>Limpar</button>
                    <button className="dashboard-btn-secondary" onClick={() => setShowFiltroModal(false)} style={{ minWidth: 90 }}>Fechar</button>
                  </div>
                </ModalBase>
              )}
              {/* Conteúdo dinâmico conforme modo de visualização */}
              <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {tableLoading ? (
                  <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg className="toolbar-spinner" width="48" height="48" viewBox="0 0 50 50"><circle className="path" cx="25" cy="25" r="20" fill="none" stroke="#b18cff" strokeWidth="5"/></svg>
                  </div>
                ) : (
                  viewMode === 'lista' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 8px 24px 8px', width: '100%' }}>
                      {filteredTransactions.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#aaa', fontSize: 16, marginTop: 32 }}>Nenhuma transação encontrada.</div>
                      ) : (
                        filteredTransactions.map((t, idx) => {
                          const isEntrada = t.tipo === 'D' || t.tipo === 'O';
                          const cor = isEntrada ? '#27ae60' : '#e74c3c';
                          const icone = isEntrada ? (
                            <svg width="26" height="26" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#eafaf1"/><path d="M12 7v10M7 12h10" stroke="#27ae60" strokeWidth="2" strokeLinecap="round"/></svg>
                          ) : (
                            <svg width="26" height="26" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#fbeaea"/><path d="M7 12h10" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round"/></svg>
                          );
                          return (
                            <div key={t.id || idx} style={{ display: 'flex', alignItems: 'center', borderRadius: 16, border: '1px solid #e3e9f7', padding: '10px 10px', minHeight: 60, background: '#fff', boxShadow: '0 2px 8px #4f8cff0a', cursor: 'pointer', transition: 'box-shadow 0.15s' }}>
                              <div onClick={() => handleEdit(t)} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                <div style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, background: isEntrada ? '#eafaf1' : '#fbeaea' }}>
                                  {icone}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: 15, color: '#222', marginBottom: 2 }}>{t.tipo === 'D' ? 'Dízimo' : t.tipo === 'O' ? 'Oferta' : t.tipo_despesa ? getTipoDespesaDisplay(t.tipo_despesa) : 'Despesa'}</div>
                                  <div style={{ fontSize: 14, color: cor, fontWeight: 600 }}>R$ {Number(t.quantia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                  <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{t.descricao || '-'}</div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 38 }}>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: '#4f8cff' }}>{t.data ? `${parseInt(t.data.split('-')[2])}/${parseInt(t.data.split('-')[1])}` : ''}</div>
                                </div>
                                <div style={{ fontSize: 22, marginLeft: 8, color: '#bbb' }}>&gt;</div>
                              </div>
                              {/* Botão deletar mobile */}
                              <button
                                onClick={() => setSelectedTransaction(t)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  marginLeft: 8,
                                  padding: 6,
                                  borderRadius: '50%',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#e74c3c',
                                  transition: 'background 0.2s',
                                }}
                                title="Deletar transação"
                              >
                                <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="5" y="7" width="14" height="12" rx="2" stroke="#e74c3c" strokeWidth="2"/><path d="M10 11v4M14 11v4" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round"/><path d="M9 7V5a3 3 0 0 1 6 0v2" stroke="#e74c3c" strokeWidth="2"/></svg>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '0 8px 24px 8px', width: '100%' }}>
                      <RelatorioPdfInterativo
                        igrejaId={igrejaUsuario ? igrejaUsuario.id : null}
                        igrejaNome={igrejaUsuario ? igrejaUsuario.nome : ''}
                        mes={new Date(0, currentMonth - 1).toLocaleString('pt-BR', { month: 'long' })}
                        transactions={filteredTransactions}
                        getTipoDespesaDisplay={getTipoDespesaDisplay}
                        currentMonth={currentMonth}
                        currentYear={currentYear}
                      />
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            // DESKTOP: layout original com CSS
            <>
              <section className="dashboard-card">
                <div className="dashboard-header-row">
                  <span className="dashboard-title">{igrejaUsuario ? igrejaUsuario.nome : 'Dashboard Financeiro'}</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="dashboard-btn-primary dashboard-btn-mobile-icon"
                      onClick={() => setShowForm(true)}
                      aria-label="Nova Transação"
                    >
                      <span className="dashboard-btn-text">Nova Transação</span>
                      <span className="dashboard-btn-icon"><FaPlus /></span>
                    </button>
                    <button
                      className="dashboard-btn-report dashboard-btn-mobile-icon"
                      onClick={() => setShowReportModal((v) => !v)}
                      title="Gerar/Fechar Relatório"
                      aria-label={showReportModal ? 'Fechar Relatório' : 'Gerar Relatório'}
                    >
                      <span className="dashboard-btn-text">{showReportModal ? 'Fechar Relatório' : 'Gerar Relatório'}</span>
                      <span className="dashboard-btn-icon"><FaFileAlt /></span>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <button
                    className={viewMode === 'lista' ? 'dashboard-btn-primary' : 'dashboard-btn-secondary'}
                    onClick={() => setViewMode('lista')}
                    style={{ minWidth: 140 }}
                  >
                    Visualização em Lista
                  </button>
                  <button
                    className={viewMode === 'pdf' ? 'dashboard-btn-primary' : 'dashboard-btn-secondary'}
                    onClick={() => setViewMode('pdf')}
                    style={{ minWidth: 140 }}
                  >
                    Visualização em PDF
                  </button>
                </div>
                {/* Modern Advanced Filters */}
                <div className="modern-filters-container">
                  {/* Primary Search Bar */}
                  <div className="primary-search-bar">
                    <div className="search-input-container">
                      <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <input
                        type="text"
                        className="general-search-input"
                        placeholder="Buscar em todas as transações..."
                        value={generalSearch}
                        onChange={e => setGeneralSearch(e.target.value)}
                      />
                      {generalSearch && (
                        <button className="clear-search-btn" onClick={() => setGeneralSearch('')}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    <button 
                      className={`advanced-filters-toggle ${showAdvancedFilters ? 'active' : ''}`}
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      style={{
                        background: showAdvancedFilters ? '#4f8cff' : '#fff',
                        color: showAdvancedFilters ? '#fff' : '#4f8cff',
                        border: '2px solid #4f8cff',
                        borderRadius: 12,
                        padding: '12px 20px',
                        fontSize: 14,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: showAdvancedFilters ? '0 4px 12px rgba(79, 140, 255, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                        transform: showAdvancedFilters ? 'translateY(-1px)' : 'translateY(0)'
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Filtros Avançados
                      <svg 
                        className={`chevron ${showAdvancedFilters ? 'rotated' : ''}`} 
                        width="14" height="14" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                          transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }}
                      >
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Advanced Filters Panel */}
                  {showAdvancedFilters && (
                    <div className="advanced-filters-panel" style={{
                      background: '#fff',
                      border: '2px solid #e3e9f7',
                      borderRadius: 16,
                      padding: 24,
                      marginTop: 16,
                      boxShadow: '0 8px 32px rgba(79, 140, 255, 0.1)',
                      animation: 'slideDown 0.3s ease-out'
                    }}>
                      <div className="filters-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        {/* Date Range Filters */}
                        <div className="filter-group" style={{
                          background: '#f8fafc',
                          padding: 20,
                          borderRadius: 12,
                          border: '1px solid #e3e9f7'
                        }}>
                          <h4 className="filter-group-title" style={{
                            color: '#4f8cff',
                            fontSize: 16,
                            fontWeight: 700,
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                              <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4f8cff" strokeWidth="2"/>
                              <path d="M16 2v4M8 2v4M3 10h18" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Período
                          </h4>
                          <div className="date-range-inputs" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="date-input-wrapper">
                              <label className="filter-label" style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' }}>Data Inicial</label>
                              <input
                                type="date"
                                className="modern-filter-input"
                                value={dateRangeStart}
                                onChange={e => setDateRangeStart(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  border: '2px solid #e3e9f7',
                                  borderRadius: 8,
                                  fontSize: 14,
                                  outline: 'none',
                                  transition: 'border-color 0.3s ease'
                                }}
                              />
                            </div>
                            <div className="date-input-wrapper">
                              <label className="filter-label" style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' }}>Data Final</label>
                              <input
                                type="date"
                                className="modern-filter-input"
                                value={dateRangeEnd}
                                onChange={e => setDateRangeEnd(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  border: '2px solid #e3e9f7',
                                  borderRadius: 8,
                                  fontSize: 14,
                                  outline: 'none',
                                  transition: 'border-color 0.3s ease'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Legacy Filters Enhanced */}
                        <div className="filter-group" style={{
                          background: '#f8fafc',
                          padding: 20,
                          borderRadius: 12,
                          border: '1px solid #e3e9f7'
                        }}>
                          <h4 className="filter-group-title" style={{
                            color: '#8e44ad',
                            fontSize: 16,
                            fontWeight: 700,
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                              <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" stroke="#8e44ad" strokeWidth="2"/>
                            </svg>
                            Filtros Específicos
                          </h4>
                          <div className="specific-filters-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="filter-item">
                              <label className="filter-label" style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' }}>Mês</label>
                              <select className="modern-filter-input" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '2px solid #e3e9f7',
                                borderRadius: 8,
                                fontSize: 14,
                                outline: 'none'
                              }}>
                                <option value="">Todos</option>
                                {[...Array(12)].map((_, i) => (
                                  <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
                                ))}
                              </select>
                            </div>
                            <div className="filter-item">
                              <label className="filter-label" style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' }}>Ano</label>
                              <input className="modern-filter-input" type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} min="2020" max={new Date().getFullYear()} style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '2px solid #e3e9f7',
                                borderRadius: 8,
                                fontSize: 14,
                                outline: 'none'
                              }} />
                            </div>
                            <div className="filter-item">
                              <label className="filter-label" style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' }}>Dia</label>
                              <input className="modern-filter-input" type="text" value={searchDay} onChange={e => setSearchDay(e.target.value)} placeholder="Ex: 15" style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '2px solid #e3e9f7',
                                borderRadius: 8,
                                fontSize: 14,
                                outline: 'none'
                              }} />
                            </div>
                            <div className="filter-item">
                              <label className="filter-label" style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' }}>Tipo</label>
                              <select className="modern-filter-input" value={searchType} onChange={e => setSearchType(e.target.value)} style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '2px solid #e3e9f7',
                                borderRadius: 8,
                                fontSize: 14,
                                outline: 'none'
                              }}>
                                <option value="">Todos</option>
                                <option value="D">Dízimo</option>
                                <option value="O">Oferta</option>
                                <option value="S">Despesa</option>
                              </select>
                            </div>
                            <div className="filter-item" style={{ gridColumn: '1 / -1' }}>
                              <label className="filter-label" style={{ fontSize: 14, fontWeight: 600, color: '#666', marginBottom: 6, display: 'block' }}>Descrição</label>
                              <input className="modern-filter-input" type="text" value={searchDescription} onChange={e => setSearchDescription(e.target.value)} placeholder="Buscar por descrição..." style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '2px solid #e3e9f7',
                                borderRadius: 8,
                                fontSize: 14,
                                outline: 'none'
                              }} />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Filter Actions */}
                      <div className="filter-actions" style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                        <button 
                          className="clear-filters-btn"
                          onClick={() => {
                            setGeneralSearch('');
                            setDateRangeStart('');
                            setDateRangeEnd('');
                            setSearchDay('');
                            setSearchDescription('');
                            setSearchType('');
                            setSelectedMonth('');
                            setSelectedYear(new Date().getFullYear());
                          }}
                          style={{
                            background: '#e74c3c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '12px 24px',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                          Limpar Filtros
                        </button>
                      </div>
                      <style>{`
                        @keyframes slideDown {
                          from { opacity: 0; transform: translateY(-20px); }
                          to { opacity: 1; transform: translateY(0); }
                        }
                      `}</style>
                    </div>
                  )}
                </div>
              </section>
              <section className="dashboard-saldo-card">
                <SaldoIndicator saldo={saldo} />
              </section>
              <section className="dashboard-card">
                {viewMode === 'lista' ? (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 17, color: '#4f8cff' }}>Transações</span>
                      <button
                        className="dashboard-btn-refresh"
                        onClick={async () => {
                          setTableLoading(true);
                          await updateTransactions();
                          await updateSaldo();
                          setTableLoading(false);
                        }}
                        style={{
                          background: '#fff',
                          border: '1.5px solid #4f8cff',
                          borderRadius: '50%',
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px #4f8cff11',
                          transition: 'box-shadow 0.2s',
                          marginLeft: 8
                        }}
                        title="Atualizar lista de transações"
                        disabled={tableLoading}
                      >
                        <svg
                          width="22" height="22" viewBox="0 0 24 24" fill="none"
                          style={{
                            animation: tableLoading ? 'spin 0.8s linear infinite' : 'none',
                            opacity: tableLoading ? 0.5 : 1
                          }}
                        >
                          <path d="M12 4V2L7 6.5L12 11V9C15.31 9 18 11.69 18 15C18 18.31 15.31 21 12 21C8.69 21 6 18.31 6 15H4C4 19.42 7.58 23 12 23C16.42 23 20 19.42 20 15C20 10.58 16.42 7 12 7V4Z" fill="#4f8cff"/>
                        </svg>
                        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                      </button>
                    </div>
                    {tableLoading && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(255,255,255,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10
                      }}>
                        <div className="zz-spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
                        <style>{`
                          .zz-spinner {
                            border: 4px solid #e3e9f7;
                            border-top: 4px solid #4f8cff;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: zz-spin 0.9s linear infinite;
                          }
                          @keyframes zz-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                        `}</style>
                      </div>
                    )}
                    <TransactionList
                      transactions={filteredTransactions}
                      onEdit={setEditingTransaction}
                      onDelete={setSelectedTransaction}
                      onTransactionClick={setSelectedTransaction}
                      setTransactions={setTransactions}
                      setNotification={setNotification}
                      igrejaId={igrejaUsuario ? igrejaUsuario.id : null}
                    />
                  </div>
                ) : (
                  <RelatorioPdfInterativo
                    igrejaId={igrejaUsuario ? igrejaUsuario.id : null}
                    igrejaNome={igrejaUsuario ? igrejaUsuario.nome : ''}
                    mes={new Date(0, currentMonth - 1).toLocaleString('pt-BR', { month: 'long' })}
                    transactions={filteredTransactions}
                    getTipoDespesaDisplay={getTipoDespesaDisplay}
                    currentMonth={currentMonth}
                    currentYear={currentYear}
                  />
                )}
              </section>
            </>
          )}
        </main>
      )}
      {showForm && (
        <TransactionForm
          isOpen={showForm}
          onCancel={() => setShowForm(false)}
          onTransactionAdded={handleTransactionAdded}
          setNotification={setNotification}
          igrejaId={igrejaUsuario ? igrejaUsuario.id : null}
        />
      )}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSave}
          setNotification={setNotification}
          onDelete={() => {
            setSelectedTransaction(editingTransaction);
            setEditingTransaction(null);
          }}
        />
      )}
      {selectedTransaction && (
        <ConfirmationModal
          isOpen={!!selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onConfirm={confirmDelete}
          message="Tem certeza que deseja excluir esta transação?"
        />
      )}
      {showCalculator && (
        <SmartCalculator
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
        />
      )}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <style>{`
        .pdf-generation-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(255, 255, 255, 0.98);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease-out;
        }

        .pdf-generation-overlay.fade-out {
          animation: fadeOut 0.3s ease-out forwards;
        }

        .pdf-generation-content {
          text-align: center;
          padding: 20px;
        }

        .pdf-animation {
          position: relative;
          width: 280px;
          height: 380px;
          margin: 0 auto;
        }

        .pdf-page {
          width: 100%;
          height: 100%;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
          animation: pageGlow 2s ease-in-out infinite;
        }

        .status-text {
          position: absolute;
          bottom: 32px;
          left: 0;
          right: 0;
          text-align: center;
          color: #666;
          font-size: 16px;
          font-weight: 500;
        }

        .math-symbols {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          gap: 20px;
        }

        .math-symbols span {
          font-size: 42px;
          opacity: 0;
          animation: symbolFloat 2s ease-in-out infinite;
          font-weight: bold;
        }

        .math-symbols span.entrada {
          color: #27ae60;
        }

        .math-symbols span.saida {
          color: #e74c3c;
        }

        .lines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          padding: 40px 20px;
        }

        .line {
          height: 2px;
          background: #e3e9f7;
          width: 0;
          animation: lineGrow 1.5s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes pageGlow {
          0%, 100% { box-shadow: 0 4px 24px rgba(79, 140, 255, 0.1); }
          50% { box-shadow: 0 4px 32px rgba(79, 140, 255, 0.3); }
        }

        @keyframes symbolFloat {
          0% { opacity: 0; transform: translateY(20px); }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-20px); }
        }

        @keyframes lineGrow {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
      {showReportModal && (
        <ModalBase isOpen={showReportModal} onClose={() => setShowReportModal(false)} contentClassName="dashboard-report-modal dashboard-report-modal-mobile modalbase-no-padding">
          <div style={{ padding: 16 }}>
            <div className="modal-header-mobile">
              <span className="modal-title-mobile">
                <svg width="20" height="20" style={{marginRight:6,verticalAlign:'middle'}} fill="none" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="4" stroke="#f39c12" strokeWidth="2"/><path d="M8 2v4M16 2v4M3 10h18" stroke="#f39c12" strokeWidth="2" strokeLinecap="round"/></svg>
                Fechamento: {new Date(0, currentMonth - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} {currentYear}
              </span>
              <button className="modal-close-btn-mobile" onClick={() => setShowReportModal(false)} aria-label="Fechar">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            {saldoMensal?.fechado ? (
              // Mês já fechado - mostrar resumo simples (FechamentoMes removido)
              <div className="modal-closed-simple" style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>
                  Mês já fechado em {saldoMensal?.data_fechamento ? new Date(saldoMensal.data_fechamento).toLocaleString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
                <div style={{ marginBottom: 6 }}>Saldo Anterior: R$ {saldoMensal?.saldo_anterior?.toFixed ? saldoMensal.saldo_anterior.toFixed(2) : Number(saldoMensal?.saldo_anterior || 0).toFixed(2)}</div>
                <div style={{ marginBottom: 6 }}>Saldo do Mês: R$ {saldoMensal?.saldo_mes?.toFixed ? saldoMensal.saldo_mes.toFixed(2) : Number(saldoMensal?.saldo_mes || 0).toFixed(2)}</div>
                <div style={{ marginBottom: 12 }}>Total em Caixa: R$ {saldoMensal?.saldo_final?.toFixed ? saldoMensal.saldo_final.toFixed(2) : Number(saldoMensal?.saldo_final || 0).toFixed(2)}</div>
                <div>
                  <button className="btn-mobile-pdf-full" onClick={generatePdfPreview} title="Baixar PDF de Prévia">Ver PDF</button>
                </div>
              </div>
            ) : (
              // Interface para novo fechamento
              <>
                <div className="modal-cards-row-mobile" style={{ flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div className="modal-card-mobile entradas">R$ {previewData ? previewData.totalEntradas.toFixed(2) : '0,00'}<span>Entradas</span></div>
                  <div className="modal-card-mobile saidas">R$ {previewData ? previewData.totalSaidas.toFixed(2) : '0,00'}<span>Saídas</span></div>
                  <div className="modal-card-mobile saldo">R$ {previewData ? previewData.saldoMes.toFixed(2) : '0,00'}<span>Saldo do mês</span></div>
                  <div className="modal-card-mobile final">R$ {previewData ? previewData.saldoFinal.toFixed(2) : '0,00'}<span>Total em caixa</span></div>
                  <div className="modal-card-mobile saldo-anterior">R$ {previewData ? previewData.saldoAnterior.toFixed(2) : '0,00'}<span>Saldo Anterior</span></div>
                  <div className="modal-card-mobile dizimo-igreja">R$ {previewData ? (previewData.dizimoIgreja || 0).toFixed(2) : '0,00'}<span>Dízimo Igreja</span></div>
                </div>
                <div className="modal-options-mobile" style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-start',margin:'10px 0 8px 0'}}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <label className="modal-checkbox-mobile">
                      <input type="checkbox" checked={includeGratificacao} onChange={e => handleGratificacaoChange(e.target.checked)} disabled={!isGratificacaoEnabled} />
                      <span className="icon"></span>
                      Gratificação do Líder
                    </label>
                    {includeGratificacao && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          value={valorGratificacao}
                          onChange={(e) => setValorGratificacao(e.target.value)}
                          style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1.5px solid #e3e9f7',
                            width: '120px',
                            fontSize: '14px'
                          }}
                          placeholder="Valor"
                          required
                          min="0"
                          step="0.01"
                        />
                        <button
                          onClick={() => {
                            if (Number(valorGratificacao) >= 0) {
                              setPreviewData(prev => ({
                                ...prev,
                                gratificacao: Number(valorGratificacao)
                              }));
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#4f8cff',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Confirmar
                        </button>
                      </div>
                    )}
                  </div>
                  <label className="modal-checkbox-mobile">
                    <input type="checkbox" checked={includeDizimoGratificacao} onChange={e => setIncludeDizimoGratificacao(e.target.checked)} disabled={!includeGratificacao} />
                    <span className="icon"></span>
                    Dízimo da Gratificação
                  </label>
                  <label className="modal-checkbox-mobile">
                    <input type="checkbox" checked={includeDizimoIgreja} onChange={e => setIncludeDizimoIgreja(e.target.checked)} />
                    <span className="icon"></span>
                    Dízimo da Igreja
                  </label>
                  {!isGratificacaoEnabled && (
                    <div className="modal-warning-mobile">Saldo insuficiente para gratificação do pastor.</div>
                  )}
                </div>
                <div className="modal-actions-mobile" style={{display:'flex',flexDirection:'row',justifyContent:'center',alignItems:'center',gap:12,marginTop:10}}>
                  <button className="btn-mobile-primary" style={{background:'#2563eb',color:'#fff',fontWeight:700,padding:'10px 18px',borderRadius:8,border:'none',fontSize:'1.08rem',display:'flex',alignItems:'center',gap:6,boxShadow:'0 2px 8px #0001',cursor:'pointer'}} onClick={generateMonthlyReport} disabled={isLoading}>
                    Gerar
                  </button>
                  <button className="btn-mobile-pdf-full" style={{background:'#fff',color:'#2563eb',fontWeight:600,padding:'10px 14px',borderRadius:8,border:'1.5px solid #2563eb',fontSize:'1.08rem',display:'flex',alignItems:'center',gap:6,boxShadow:'0 2px 8px #0001',cursor:'pointer'}}
                    onClick={generatePdfPreview}
                    title="Baixar PDF de Prévia">
                    Ver PDF
                  </button>
                  <button className="btn-mobile-secondary" style={{background:'#fff',color:'#888',fontWeight:600,padding:'10px 14px',borderRadius:8,border:'1.5px solid #ccc',fontSize:'1.08rem',display:'flex',alignItems:'center',gap:6,boxShadow:'0 2px 8px #0001',cursor:'pointer'}} onClick={() => setShowReportModal(false)}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalBase>
      )}
    </div>
  );
};

export default Dashboard;

// ATENÇÃO: Nenhum cálculo de entradas inclui saldoAnterior! Os cálculos são exclusivos do mês selecionado.
// totalEntradas = ofertas + dizimos + (dizimo da gratificação, se marcado)
// saldoAnterior só é usado no saldoFinal, nunca em entradas/saídas do mês.