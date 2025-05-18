import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTransactions, fetchSaldo, deleteTransaction, setupAxiosInterceptors } from '../api/transactions';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import EditTransactionModal from '../components/EditTransactionModal';
import SaldoIndicator from '../components/SaldoIndicator';
import ConfirmationModal from '../components/ConfirmationModal';
import Notification from '../components/Notification';
import Navbar from '../components/Navbar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import axiosLocal from 'axios';
import logo from '../assets/logo.png';
import './Dashboard.css';
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate, getLastDayOfMonth } from '../utils';
import { FaCalendarAlt, FaSearch, FaPlus, FaFileAlt } from 'react-icons/fa';
import RelatorioPdfPreview from '../components/RelatorioPdfPreview';
import RelatorioPdfSimulado from '../components/RelatorioPdfSimulado';
import RelatorioPdfInterativo from '../components/RelatorioPdfInterativo';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchDay, setSearchDay] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [searchType, setSearchType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [igrejaUsuario, setIgrejaUsuario] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [includeGratificacao, setIncludeGratificacao] = useState(false);
  const [includeDizimoGratificacao, setIncludeDizimoGratificacao] = useState(false);
  const [includeDizimoIgreja, setIncludeDizimoIgreja] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isGratificacaoEnabled, setIsGratificacaoEnabled] = useState(true);
  const [viewMode, setViewMode] = useState('lista'); // 'lista', 'pdf', 'interativo'
  // Estado para loading de ações
  const [actionLoading, setActionLoading] = useState(false);
  // Estado para saldo do mês anterior
  const [saldoAnterior, setSaldoAnterior] = useState(0);

  useEffect(() => {
    setupAxiosInterceptors(navigate);
  }, [navigate]);

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
      const saldoData = await fetchSaldo(navigate, igrejaUsuario ? igrejaUsuario.id : null);
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

  useEffect(() => {
    let filtered = [...transactions];

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
  }, [searchDay, searchDescription, searchType, transactions]);

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

  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      await deleteTransaction(transactionToDelete.id, navigate);
      setNotification({ message: 'Transação excluída com sucesso!', type: 'success' });
      setSelectedTransaction(null);
      await updateTransactions();
      await updateSaldo();
      setIsModalOpen(false);
      setTransactionToDelete(null);
    } catch (err) {
      setNotification({ message: 'Erro ao excluir transação: ' + err.message, type: 'error' });
      setIsModalOpen(false);
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

  // Função para gerar e salvar o PDF detalhado
  const generateMonthlyReport = async () => {
    setIsLoading(true);
    try {
      const pdfMonth = currentMonth;
      const pdfYear = currentYear;
      const lastDayOfMonth = getLastDayOfMonth(pdfYear, pdfMonth);
      let extrasCriadas = [];
      // Criar oficialmente no sistema as transações extras, se marcadas
      if (includeGratificacao) {
        const gratificacaoTransacao = {
          tipo: 'S', tipo_despesa: 'OT', descricao: 'Gratificação do Líder', quantia: 900, data: lastDayOfMonth, igreja_id: igrejaUsuario?.id
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
      // Agrupar dízimos e ofertas por dia
      const grouped = {};
      transacoesAtualizadas.forEach(t => {
        const [ano, mes, dia] = t.data.split('-');
        if (!grouped[dia]) grouped[dia] = { D: 0, O: 0, outros: [] };
        if (t.tipo === 'D') grouped[dia].D += parseFloat(t.quantia);
        else if (t.tipo === 'O') grouped[dia].O += parseFloat(t.quantia);
        else grouped[dia].outros.push(t);
      });
      // Montar formattedData agrupando D e O, mantendo outros
      let formattedData = [];
      Object.keys(grouped).sort((a, b) => parseInt(a) - parseInt(b)).forEach(dia => {
        if (grouped[dia].D > 0) formattedData.push({ dia, discriminacao: 'Dízimo', entrada: `R$ ${truncateToTwoDecimals(grouped[dia].D)}`, saida: '-' });
        if (grouped[dia].O > 0) formattedData.push({ dia, discriminacao: 'Oferta', entrada: `R$ ${truncateToTwoDecimals(grouped[dia].O)}`, saida: '-' });
        grouped[dia].outros.forEach(t => {
          let discriminacao = '';
          if (t.tipo === 'S') {
            const tipoDespesa = getTipoDespesaDisplay(t.tipo_despesa);
            discriminacao = tipoDespesa === 'Outro' ? (t.descricao || 'Outro') : tipoDespesa;
          }
          formattedData.push({
            dia,
            discriminacao,
            entrada: '-',
            saida: t.tipo === 'S' ? `R$ ${truncateToTwoDecimals(parseFloat(t.quantia))}` : '-',
          });
        });
      });
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
    let mes = currentMonth - 1;
    let ano = currentYear;
    if (mes < 1) {
      mes = 12;
      ano--;
    }
    const fetchSaldoAnterior = async () => {
      try {
        const saldoAnt = await fetchSaldo(navigate, igrejaUsuario.id, mes, ano);
        setSaldoAnterior(saldoAnt);
      } catch {
        setSaldoAnterior(0);
      }
    };
    fetchSaldoAnterior();
  }, [showReportModal, igrejaUsuario, currentMonth, currentYear]);

  // Atualiza a prévia do relatório sempre que filtros ou opções mudam
  useEffect(() => {
    // Filtra as transações do mês/ano ATUAL
    let transacoesMes = transactions.filter(t => {
      const [ano, mes] = t.data.split('-');
      return parseInt(mes) === currentMonth && parseInt(ano) === currentYear;
    });

    // 1. totalEntradasBase = ofertas + dizimos
    let totalEntradasBase = transacoesMes.filter(t => t.tipo === 'D' || t.tipo === 'O').reduce((acc, t) => acc + Number(t.quantia), 0);

    // 2. dizimoGratificacao = 90 se marcado, senão 0
    let dizimoGratificacao = includeDizimoGratificacao ? 90 : 0;

    // 3. totalEntradas = totalEntradasBase + dizimoGratificacao (se marcado)
    let totalEntradas = totalEntradasBase + dizimoGratificacao;

    // 4. dizimoIgreja = 10% do total de entradas (se marcado)
    let dizimoIgreja = includeDizimoIgreja ? totalEntradas * 0.1 : 0;

    // 5. gratificacao = 900 se marcado, senão 0
    let gratificacao = includeGratificacao ? 900 : 0;

    // 6. totalSaidas = despesas + dizimoIgreja (se marcado) + gratificacao (se marcada)
    let totalSaidas = transacoesMes.filter(t => t.tipo === 'S').reduce((acc, t) => acc + Number(t.quantia), 0) + dizimoIgreja + gratificacao;

    // 7. saldoMes = totalEntradas - totalSaidas
    let saldoMes = totalEntradas - totalSaidas;

    // 8. saldoFinal = saldoAnterior + saldoMes
    let saldoFinal = saldoAnterior + saldoMes;

    setPreviewData({
      totalEntradas,
      totalSaidas,
      saldoMes,
      saldoAnterior,
      saldoFinal,
      dizimoIgreja,
      dizimoGratificacao,
      gratificacao,
    });
  }, [transactions, includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja, saldoAnterior, currentMonth, currentYear]);

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
        <main className="dashboard-main">
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
                style={{ minWidth: 120 }}
              >
                Visualizar em Lista
              </button>
              <button
                className={viewMode === 'pdf' ? 'dashboard-btn-primary' : 'dashboard-btn-secondary'}
                onClick={() => setViewMode('pdf')}
                style={{ minWidth: 120 }}
              >
                Visualizar como PDF
              </button>
              <button
                className={viewMode === 'interativo' ? 'dashboard-btn-primary' : 'dashboard-btn-secondary'}
                onClick={() => setViewMode('interativo')}
                style={{ minWidth: 160 }}
              >
                Preencher PDF Interativo
              </button>
            </div>
            <div className="dashboard-filtros-row">
              <div className="dashboard-filtro-item">
                <label>Mês</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                  <option value="">Todos</option>
                  {[...Array(12)].map((_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div className="dashboard-filtro-item">
                <label>Ano</label>
                <input type="number" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} min="2020" max={new Date().getFullYear()} />
              </div>
              <div className="dashboard-filtro-item">
                <label>Dia</label>
                <input type="text" value={searchDay} onChange={e => setSearchDay(e.target.value)} placeholder="Ex: 15" />
              </div>
              <div className="dashboard-filtro-item">
                <label>Descrição</label>
                <input type="text" value={searchDescription} onChange={e => setSearchDescription(e.target.value)} placeholder="Buscar..." />
              </div>
              <div className="dashboard-filtro-item">
                <label>Tipo</label>
                <select value={searchType} onChange={e => setSearchType(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="D">Dízimo</option>
                  <option value="O">Oferta</option>
                  <option value="S">Despesa</option>
                </select>
              </div>
            </div>
          </section>
          <section className="dashboard-saldo-card">
            <SaldoIndicator saldo={saldo} />
          </section>
          <section className="dashboard-card">
            {viewMode === 'lista' ? (
              <TransactionList
                transactions={filteredTransactions}
                onEdit={setEditingTransaction}
                onDelete={setSelectedTransaction}
                onTransactionClick={setSelectedTransaction}
                setTransactions={setTransactions}
                setNotification={setNotification}
                igrejaId={igrejaUsuario ? igrejaUsuario.id : null}
              />
            ) : viewMode === 'pdf' ? (
              <RelatorioPdfSimulado
                transactions={transactions}
                currentMonth={currentMonth}
                currentYear={currentYear}
                previewData={previewData}
                includeGratificacao={includeGratificacao}
                includeDizimoGratificacao={includeDizimoGratificacao}
                includeDizimoIgreja={includeDizimoIgreja}
              />
            ) : (
              <RelatorioPdfInterativo
                igrejaId={igrejaUsuario ? igrejaUsuario.id : null}
                setNotification={setNotification}
                onSuccess={() => { updateTransactions(); updateSaldo(); }}
              />
            )}
          </section>
        </main>
      )}
      {showForm && (
        <TransactionForm
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
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      {showReportModal && (
        <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={e => e.target === e.currentTarget && setShowReportModal(false)}>
          <motion.div
            className="modal-content dashboard-report-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: '#f39c12', marginBottom: 12 }}>
              Fechamento do Mês: {new Date(0, currentMonth - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} de {currentYear}
            </h3>
            <div className="relatorio-modal-grid">
              <div className="relatorio-modal-info">
                <div className="preview-section" style={{background:'#f7fafc',borderRadius:8,padding:'12px 16px',marginBottom:18,marginTop:8}}>
                  <h4 style={{color:'#2c3e50',fontWeight:600,marginBottom:8}}>Prévia do Relatório</h4>
                  <p><b>Total de Entradas:</b> R$ {previewData ? previewData.totalEntradas.toFixed(2) : '0,00'}</p>
                  <p><b>Total de Saídas:</b> R$ {previewData ? previewData.totalSaidas.toFixed(2) : '0,00'}</p>
                  <p><b>Saldo do Mês:</b> R$ {previewData ? previewData.saldoMes.toFixed(2) : '0,00'}</p>
                  <p><b>Saldo Anterior:</b> R$ {previewData ? previewData.saldoAnterior.toFixed(2) : '0,00'}</p>
                  <p><b>Saldo Final:</b> R$ {previewData ? previewData.saldoFinal.toFixed(2) : '0,00'}</p>
                  <p><b>Dízimo da Igreja:</b> R$ {previewData ? previewData.dizimoIgreja.toFixed(2) : '0,00'}</p>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={includeGratificacao}
                      onChange={e => handleGratificacaoChange(e.target.checked)}
                      disabled={!isGratificacaoEnabled}
                    />
                    Incluir Gratificação do Pastor (R$ 900,00)
                  </label>
                  {!isGratificacaoEnabled && (
                    <p style={{ color: '#ffcc00', fontSize: '14px', marginTop: '5px' }}>
                      Aviso: O saldo atual não é suficiente para incluir a gratificação do pastor.
                    </p>
                  )}
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={includeDizimoGratificacao}
                      onChange={e => setIncludeDizimoGratificacao(e.target.checked)}
                      disabled={!includeGratificacao}
                    />
                    Incluir Dízimo da Gratificação (10% da gratificação)
                  </label>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={includeDizimoIgreja}
                      onChange={e => setIncludeDizimoIgreja(e.target.checked)}
                    />
                    Incluir Dízimo da Igreja (10% das entradas)
                  </label>
                </div>
                <div className="button-group">
                  <button className="edit" onClick={generateMonthlyReport}>
                    Gerar Relatório
                  </button>
                  <button className="close" onClick={() => setShowReportModal(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
              <div className="relatorio-modal-pdf">
                <RelatorioPdfPreview previewData={previewData} currentMonth={currentMonth} currentYear={currentYear} transactions={transactions} includeGratificacao={includeGratificacao} includeDizimoGratificacao={includeDizimoGratificacao} includeDizimoIgreja={includeDizimoIgreja} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

// ATENÇÃO: Nenhum cálculo de entradas inclui saldoAnterior! Os cálculos são exclusivos do mês selecionado.
// totalEntradas = ofertas + dizimos + (dizimo da gratificação, se marcado)
// saldoAnterior só é usado no saldoFinal, nunca em entradas/saídas do mês.