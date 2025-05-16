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
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate } from '../utils';
import { FaCalendarAlt, FaSearch } from 'react-icons/fa';

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

  const generateMonthlyReport = () => {
    // Lógica para gerar o relatório mensal em PDF
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Mensal', 14, 22);
    autoTable(doc, {
      startY: 30,
      head: [['Descrição', 'Valor']],
      body: [
        ['Total de Entradas', previewData.totalEntradas.toFixed(2)],
        ['Total de Saídas', previewData.totalSaidas.toFixed(2)],
        ['Saldo do Mês', previewData.saldoMes.toFixed(2)],
        ['Saldo Anterior', previewData.saldoAnterior.toFixed(2)],
        ['Saldo Final', previewData.saldoFinal.toFixed(2)],
        ['Dízimo da Igreja', previewData.dizimoIgreja.toFixed(2)],
      ],
    });
    doc.save(`relatorio_mensal_${selectedMonth}_${selectedYear}.pdf`);
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
              <span className="dashboard-title">Dashboard Financeiro</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="dashboard-btn-primary" onClick={() => setShowForm(true)}>
                  Nova Transação
                </button>
                <button
                  className="dashboard-btn-report"
                  onClick={() => setShowReportModal((v) => !v)}
                  title="Gerar/Fechar Relatório"
                >
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
            {igrejaUsuario && <span className="igreja-info">{igrejaUsuario.nome}</span>}
          </section>
          <section className="dashboard-card">
            <TransactionList
              transactions={filteredTransactions}
              onEdit={setEditingTransaction}
              onDelete={setSelectedTransaction}
              onTransactionClick={setSelectedTransaction}
              setTransactions={setTransactions}
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
            <div className="preview-section" style={{background:'#f7fafc',borderRadius:8,padding:'12px 16px',marginBottom:18,marginTop:8}}>
              <h4 style={{color:'#2c3e50',fontWeight:600,marginBottom:8}}>Prévia do Relatório</h4>
              <p><b>Total de Entradas:</b> R$ {previewData ? previewData.totalEntradas.toFixed(2) : '0,00'}</p>
              <p><b>Total de Saídas:</b> R$ {previewData ? previewData.totalSaidas.toFixed(2) : '0,00'}</p>
              <p><b>Saldo do Mês:</b> R$ {previewData ? previewData.saldoMes.toFixed(2) : '0,00'}</p>
              <p><b>Saldo Anterior:</b> R$ {previewData ? previewData.saldoAnterior.toFixed(2) : '0,00'}</p>
              <p><b>Saldo Final:</b> R$ {previewData ? previewData.saldoFinal.toFixed(2) : '0,00'}</p>
              <p><b>Dízimo da Igreja:</b> R$ {previewData ? previewData.dizimoIgreja.toFixed(2) : '0,00'}</p>
            </div>
            <div className="button-group">
              <button className="edit" onClick={generateMonthlyReport}>
                Gerar Relatório
              </button>
              <button className="close" onClick={() => setShowReportModal(false)}>
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

// ATENÇÃO: Nenhum cálculo de entradas inclui saldoAnterior! Os cálculos são exclusivos do mês selecionado.
// totalEntradas = ofertas + dizimos + (dizimo da gratificação, se marcado)
// saldoAnterior só é usado no saldoFinal, nunca em entradas/saídas do mês.