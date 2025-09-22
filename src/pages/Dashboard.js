
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
import { motion } from 'framer-motion';
import axiosLocal from 'axios';
import logo from '../assets/logo.png';
import './Dashboard.css';
import { getTipoDespesaDisplay, getLastDayOfMonth } from '../utils';
import { FaPlus, FaFileAlt } from 'react-icons/fa';

const Dashboard = () => {
  const navigate = useNavigate();
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
  const [igrejaUsuario, setIgrejaUsuario] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [includeGratificacao, setIncludeGratificacao] = useState(false);
  const [includeDizimoGratificacao, setIncludeDizimoGratificacao] = useState(false);
  const [includeDizimoIgreja, setIncludeDizimoIgreja] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [saldoAnterior, setSaldoAnterior] = useState(0);

  useEffect(() => {
    setupAxiosInterceptors(navigate);
  }, [navigate]);

  const updateTransactions = async () => {
    try {
      const transData = await fetchTransactions(selectedMonth || null, selectedYear, navigate, igrejaUsuario ? igrejaUsuario.id : null);
      setTransactions(transData);
      setFilteredTransactions(transData);
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
    try {
      const [transData, saldoData] = await Promise.all([
        fetchTransactions(selectedMonth || null, selectedYear, navigate, igrejaUsuario ? igrejaUsuario.id : null),
        fetchSaldo(navigate, igrejaUsuario ? igrejaUsuario.id : null),
      ]);
      setTransactions(transData);
      setFilteredTransactions(transData);
      setSaldo(saldoData);
    } catch (err) {
      console.error('Erro ao buscar dados:', err.message);
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

  // Filtering logic
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
    
    filtered.sort((a, b) => new Date(b.data) - new Date(a.data));
    setFilteredTransactions(filtered);
  }, [searchDay, searchDescription, searchType, transactions]);

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

  const generateMonthlyReport = async () => {
    setIsLoading(true);
    try {
      const pdfMonth = new Date().getMonth() + 1;
      const pdfYear = new Date().getFullYear();
      const lastDayOfMonth = getLastDayOfMonth(pdfYear, pdfMonth);
      
      if (includeGratificacao) {
        await axiosLocal.post(`${process.env.REACT_APP_API_URL}/api/transacoes/nova/`, {
          tipo: 'S', tipo_despesa: 'OT', descricao: 'Gratificação do Líder', quantia: 900, data: lastDayOfMonth, igreja_id: igrejaUsuario?.id
        });
      }
      if (includeDizimoGratificacao) {
        await axiosLocal.post(`${process.env.REACT_APP_API_URL}/api/transacoes/nova/`, {
          tipo: 'D', descricao: 'Dízimo da Gratificação', quantia: 90, data: lastDayOfMonth, igreja_id: igrejaUsuario?.id
        });
      }
      if (includeDizimoIgreja && previewData) {
        await axiosLocal.post(`${process.env.REACT_APP_API_URL}/api/transacoes/nova/`, {
          tipo: 'S', tipo_despesa: 'OT', descricao: 'Dízimo da Igreja', quantia: Number(truncateToTwoDecimals(previewData.dizimoIgreja)), data: lastDayOfMonth, igreja_id: igrejaUsuario?.id
        });
      }
      
      const transacoesAtualizadas = await fetchTransactions(pdfMonth, pdfYear, navigate, igrejaUsuario ? igrejaUsuario.id : null);
      
      const doc = new jsPDF({ format: 'a4', unit: 'mm' });
      try {
        doc.addImage(logo, 'PNG', 10, 10, 15, 15);
      } catch (err) {
        console.warn('Erro ao adicionar logotipo:', err);
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
      doc.text('EBENÉZER', 190, 35, { align: 'right' });
      
      const tableData = transacoesAtualizadas.map(t => [
        t.data.split('-')[2],
        t.descricao || 'Transação',
        (t.tipo === 'D' || t.tipo === 'O') ? `R$ ${truncateToTwoDecimals(t.quantia)}` : '-',
        t.tipo === 'S' ? `R$ ${truncateToTwoDecimals(t.quantia)}` : '-'
      ]);
      
      autoTable(doc, {
        startY: 40,
        head: [['DIA', 'DISCRIMINAÇÃO', 'ENTRADA', 'SAÍDA']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 1 },
        columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 80 }, 2: { cellWidth: 40, halign: 'right' }, 3: { cellWidth: 40, halign: 'right' } },
      });
      
      doc.save(`relatorio_financeiro_${pdfMonth}_${pdfYear}.pdf`);
      setNotification({ message: 'Relatório gerado com sucesso!', type: 'success' });
      await updateTransactions();
    } catch (err) {
      setNotification({ message: 'Erro ao gerar o relatório: ' + err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

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
      }
    };
    fetchUserProfile();
  }, []);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

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
  }, [showReportModal, igrejaUsuario, currentMonth, currentYear, navigate]);

  useEffect(() => {
    let transacoesMes = transactions.filter(t => {
      const [ano, mes] = t.data.split('-');
      return parseInt(mes) === currentMonth && parseInt(ano) === currentYear;
    });

    let totalEntradasBase = transacoesMes.filter(t => t.tipo === 'D' || t.tipo === 'O').reduce((acc, t) => acc + Number(t.quantia), 0);
    let dizimoGratificacao = includeDizimoGratificacao ? 90 : 0;
    let totalEntradas = totalEntradasBase + dizimoGratificacao;
    let dizimoIgreja = includeDizimoIgreja ? totalEntradas * 0.1 : 0;
    let gratificacao = includeGratificacao ? 900 : 0;
    let totalSaidas = transacoesMes.filter(t => t.tipo === 'S').reduce((acc, t) => acc + Number(t.quantia), 0) + dizimoIgreja + gratificacao;
    let saldoMes = totalEntradas - totalSaidas;
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px' }}>
          Carregando...
        </div>
      ) : (
        <main className="dashboard-main">
          <section className="dashboard-card">
            <div className="dashboard-header-row">
              <span className="dashboard-title">{igrejaUsuario ? igrejaUsuario.nome : 'Dashboard Financeiro'}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="dashboard-btn-primary" onClick={() => setShowForm(true)}>
                  <FaPlus style={{ marginRight: 6 }} />
                  Nova Transação
                </button>
                <button className="dashboard-btn-report" onClick={() => setShowReportModal(!showReportModal)}>
                  <FaFileAlt style={{ marginRight: 6 }} />
                  {showReportModal ? 'Fechar Relatório' : 'Gerar Relatório'}
                </button>
              </div>
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
            <TransactionList
              transactions={filteredTransactions}
              onEdit={handleEdit}
              onDelete={setSelectedTransaction}
              setNotification={setNotification}
              igrejaId={igrejaUsuario ? igrejaUsuario.id : null}
            />
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

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {showReportModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReportModal(false)}>
          <motion.div
            className="modal-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Fechamento: {new Date(0, currentMonth - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} {currentYear}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <p>Total Entradas: R$ {previewData ? previewData.totalEntradas.toFixed(2) : '0,00'}</p>
              <p>Total Saídas: R$ {previewData ? previewData.totalSaidas.toFixed(2) : '0,00'}</p>
              <p>Saldo do Mês: R$ {previewData ? previewData.saldoMes.toFixed(2) : '0,00'}</p>
              <p>Saldo Anterior: R$ {previewData ? previewData.saldoAnterior.toFixed(2) : '0,00'}</p>
              <p><strong>Saldo Final: R$ {previewData ? previewData.saldoFinal.toFixed(2) : '0,00'}</strong></p>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input type="checkbox" checked={includeGratificacao} onChange={e => handleGratificacaoChange(e.target.checked)} />
                Gratificação do Pastor (R$ 900)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <input type="checkbox" checked={includeDizimoGratificacao} onChange={e => setIncludeDizimoGratificacao(e.target.checked)} disabled={!includeGratificacao} />
                Dízimo da Gratificação (R$ 90)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={includeDizimoIgreja} onChange={e => setIncludeDizimoIgreja(e.target.checked)} />
                Dízimo da Igreja (10% das entradas)
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="dashboard-btn-primary" onClick={generateMonthlyReport} disabled={isLoading}>
                Gerar Relatório
              </button>
              <button className="dashboard-btn-secondary" onClick={() => setShowReportModal(false)}>
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
