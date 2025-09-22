
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement
} from 'chart.js';
import './AdminPanel.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement
);

const AdminPanel = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedIgreja, setSelectedIgreja] = useState('');
  const [notification, setNotification] = useState(null);

  // Verificar se é admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/me/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.data.is_superuser) {
          navigate('/');
          return;
        }
      } catch (error) {
        navigate('/login');
      }
    };
    checkAdmin();
  }, [navigate]);

  // Buscar dados do dashboard
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const [transResponse, usersResponse, igrejasResponse] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/admin/transacoes/`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { mes: selectedMonth, ano: selectedYear, igreja_id: selectedIgreja }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/admin/usuarios/`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setTransactions(transResponse.data);
        setUsers(usersResponse.data);
        setIgrejas(igrejasResponse.data);

        // Calcular dados do dashboard
        const totalEntradas = transResponse.data
          .filter(t => t.tipo === 'D' || t.tipo === 'O')
          .reduce((sum, t) => sum + parseFloat(t.quantia), 0);
        
        const totalSaidas = transResponse.data
          .filter(t => t.tipo === 'S')
          .reduce((sum, t) => sum + parseFloat(t.quantia), 0);
        
        const saldo = totalEntradas - totalSaidas;
        const totalDizimos = transResponse.data
          .filter(t => t.tipo === 'D')
          .reduce((sum, t) => sum + parseFloat(t.quantia), 0);
        
        const totalOfertas = transResponse.data
          .filter(t => t.tipo === 'O')
          .reduce((sum, t) => sum + parseFloat(t.quantia), 0);

        setDashboardData({
          totalEntradas,
          totalSaidas,
          saldo,
          totalDizimos,
          totalOfertas,
          totalTransacoes: transResponse.data.length,
          totalUsuarios: usersResponse.data.length,
          totalIgrejas: igrejasResponse.data.length
        });
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setNotification({ type: 'error', message: 'Erro ao carregar dados' });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedMonth, selectedYear, selectedIgreja]);

  // Função para deletar transação
  const deleteTransaction = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta transação?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/transacoes/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(transactions.filter(t => t.id !== id));
      setNotification({ type: 'success', message: 'Transação deletada com sucesso!' });
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao deletar transação' });
    }
  };

  // Função para limpar mês
  const clearMonth = async () => {
    if (!window.confirm(`Tem certeza que deseja deletar todas as transações de ${selectedMonth}/${selectedYear}${selectedIgreja ? ` da igreja selecionada` : ''}?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/admin/limpar-mes/`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { mes: selectedMonth, ano: selectedYear, igreja_id: selectedIgreja || null }
      });
      setTransactions([]);
      setNotification({ type: 'success', message: 'Mês limpo com sucesso!' });
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao limpar mês' });
    }
  };

  // Dados para gráficos
  const chartData = {
    entradasSaidas: {
      labels: ['Entradas', 'Saídas'],
      datasets: [{
        data: [dashboardData.totalEntradas || 0, dashboardData.totalSaidas || 0],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0
      }]
    },
    dizimoOfertas: {
      labels: ['Dízimos', 'Ofertas'],
      datasets: [{
        data: [dashboardData.totalDizimos || 0, dashboardData.totalOfertas || 0],
        backgroundColor: ['#3b82f6', '#8b5cf6'],
        borderWidth: 0
      }]
    }
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  if (loading) {
    return (
      <div className="admin-panel-loading">
        <div className="spinner"></div>
        <p>Carregando painel administrativo...</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
          <button onClick={() => setNotification(null)}>×</button>
        </div>
      )}

      <header className="admin-header">
        <h1>Painel Administrativo</h1>
        <button onClick={() => navigate('/')} className="back-to-dashboard">
          Voltar ao Dashboard
        </button>
      </header>

      <nav className="admin-tabs">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'transacoes' ? 'active' : ''}
          onClick={() => setActiveTab('transacoes')}
        >
          Transações
        </button>
        <button
          className={activeTab === 'usuarios' ? 'active' : ''}
          onClick={() => setActiveTab('usuarios')}
        >
          Usuários
        </button>
        <button
          className={activeTab === 'igrejas' ? 'active' : ''}
          onClick={() => setActiveTab('igrejas')}
        >
          Igrejas
        </button>
      </nav>

      <div className="admin-content">
        {activeTab === 'dashboard' && (
          <motion.div 
            className="dashboard-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Filtros */}
            <div className="filters-section">
              <select 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="filter-select"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>
                    {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="filter-input"
                min="2020"
                max="2030"
              />
              <select 
                value={selectedIgreja} 
                onChange={e => setSelectedIgreja(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas as Igrejas</option>
                {igrejas.map(igreja => (
                  <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
                ))}
              </select>
            </div>

            {/* Cards de estatísticas */}
            <div className="stats-grid">
              <div className="stat-card entradas">
                <h3>Total de Entradas</h3>
                <p>R$ {(dashboardData.totalEntradas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="stat-card saidas">
                <h3>Total de Saídas</h3>
                <p>R$ {(dashboardData.totalSaidas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="stat-card saldo">
                <h3>Saldo</h3>
                <p style={{ color: dashboardData.saldo >= 0 ? '#10b981' : '#ef4444' }}>
                  R$ {(dashboardData.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="stat-card dizimos">
                <h3>Dízimos</h3>
                <p>R$ {(dashboardData.totalDizimos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="stat-card ofertas">
                <h3>Ofertas</h3>
                <p>R$ {(dashboardData.totalOfertas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="stat-card geral">
                <h3>Transações</h3>
                <p>{dashboardData.totalTransacoes || 0}</p>
              </div>
              <div className="stat-card geral">
                <h3>Usuários</h3>
                <p>{dashboardData.totalUsuarios || 0}</p>
              </div>
              <div className="stat-card geral">
                <h3>Igrejas</h3>
                <p>{dashboardData.totalIgrejas || 0}</p>
              </div>
            </div>

            {/* Gráficos */}
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Entradas vs Saídas</h3>
                <Doughnut data={chartData.entradasSaidas} options={chartOptions} />
              </div>
              <div className="chart-container">
                <h3>Dízimos vs Ofertas</h3>
                <Doughnut data={chartData.dizimoOfertas} options={chartOptions} />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'transacoes' && (
          <motion.div 
            className="transacoes-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="tab-header">
              <h2>Gerenciar Transações</h2>
              <button onClick={clearMonth} className="danger-btn">
                Limpar Mês ({selectedMonth}/{selectedYear})
              </button>
            </div>
            
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Igreja</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>{new Date(transaction.data).toLocaleDateString('pt-BR')}</td>
                      <td>{transaction.igreja?.nome || 'N/A'}</td>
                      <td>
                        <span className={`tipo-badge ${transaction.tipo}`}>
                          {transaction.tipo === 'D' ? 'Dízimo' : 
                           transaction.tipo === 'O' ? 'Oferta' : 'Despesa'}
                        </span>
                      </td>
                      <td>{transaction.descricao || 'N/A'}</td>
                      <td>R$ {parseFloat(transaction.quantia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <button 
                          onClick={() => deleteTransaction(transaction.id)}
                          className="delete-btn"
                        >
                          Deletar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'usuarios' && (
          <motion.div 
            className="usuarios-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Usuários do Sistema</h2>
            <div className="users-grid">
              {users.map(user => (
                <div key={user.id} className="user-card">
                  <h3>{user.username}</h3>
                  <p>Email: {user.email || 'N/A'}</p>
                  <p>Igreja: {user.igreja?.nome || 'N/A'}</p>
                  <p>Admin: {user.is_superuser ? 'Sim' : 'Não'}</p>
                  <p>Ativo: {user.is_active ? 'Sim' : 'Não'}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'igrejas' && (
          <motion.div 
            className="igrejas-tab"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Igrejas Cadastradas</h2>
            <div className="igrejas-grid">
              {igrejas.map(igreja => (
                <div key={igreja.id} className="igreja-card">
                  <h3>{igreja.nome}</h3>
                  <p>Líder: {igreja.lider}</p>
                  <p>Usuários: {users.filter(u => u.igreja?.id === igreja.id).length}</p>
                  <p>Transações: {transactions.filter(t => t.igreja?.id === igreja.id).length}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
