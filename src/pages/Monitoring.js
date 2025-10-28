import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import PdfGenerationAnimation from '../components/PdfGenerationAnimation';
import axios from 'axios';
import './Monitoring.css';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatDateForApi = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const Monitoring = () => {
  const [userData, setUserData] = useState(null);
  const [churchData, setChurchData] = useState(null);
  const [transactionData, setTransactionData] = useState(null);
  const [periodMonths, setPeriodMonths] = useState(12); // padrão: 12 meses
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [selectedMetrics, setSelectedMetrics] = useState(['entradas', 'saidas']); // padrão: entradas/saídas
  const [availableMonths, setAvailableMonths] = useState([]);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [monthsModalOpen, setMonthsModalOpen] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [selectedCompareMonths, setSelectedCompareMonths] = useState(() => {
    const today = new Date();
    const currentMonth = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const lastMonth = `${String(today.getMonth()).padStart(2, '0')}/${today.getFullYear()}`;
    return [currentMonth, lastMonth];
  });
  const [pieScope, setPieScope] = useState('period'); // 'period' or specific month string
  const [pieDateRange, setPieDateRange] = useState({ start: null, end: null });
  const [selectedMetric, setSelectedMetric] = useState('dizimos');
  const [dbStatus, setDbStatus] = useState({ status: 'checking', lastCheck: null });
  const [backupStatus, setBackupStatus] = useState({ reports: 'checking', database: 'checking' });
  const [backupsList, setBackupsList] = useState([]);
  const [runningBackup, setRunningBackup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const POLL_INTERVAL_MS = 30000; // 30s

  const handleDateRangeChange = useCallback((start, end) => {
    setCustomDateRange({ start, end });
  }, []);

  const handleGeneratePdf = useCallback(async () => {
    try {
      setIsGeneratingPdf(true);
      // TODO: Implementar geração real do PDF
      await new Promise(resolve => setTimeout(resolve, 3000));
      setIsGeneratingPdf(false);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setError('Erro ao gerar o relatório PDF');
      setIsGeneratingPdf(false);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchTransactionData(periodMonths);
    checkDatabaseConnection();
    checkBackupStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // polling for near-real-time updates (transactions + statuses)
  useEffect(() => {
    const id = setInterval(() => {
      fetchTransactionData(periodMonths);
      checkDatabaseConnection();
      checkBackupStatus();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonths]);

  useEffect(() => {
    // refetch when period or date range changes
    fetchTransactionData(periodMonths);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodMonths, customDateRange.start, customDateRange.end]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token);
      console.log('API URL:', process.env.REACT_APP_API_URL);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('User Profile Response:', response.data);
      setUserData(response.data);
      setChurchData(response.data.igreja);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setError('Erro ao carregar perfil do usuário');
    }
  };

  const fetchTransactionData = async (months = 6) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Buscando dados de transações...');
      let url = `${process.env.REACT_APP_API_URL}/api/transacoes/estatisticas/`;
      
      // Usar intervalo de datas personalizado se definido
      if (customDateRange.start && customDateRange.end) {
        url += `?start_date=${formatDateForApi(customDateRange.start)}&end_date=${formatDateForApi(customDateRange.end)}`;
      } else {
        url += `?months=${months}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Dados de transações:', response.data);
      setTransactionData(response.data);
      // populate available months for multi-select (labels)
      const monthsList = (response.data.monthlyTotals || []).map(m => m.month);
      setAvailableMonths(monthsList);
      // reset compare selection if empty
      setSelectedCompareMonths(prev => prev.filter(m => monthsList.includes(m)));
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar transações:', err);
      setError('Erro ao carregar dados das transações');
      setLoading(false);
    }
  };

  const checkDatabaseConnection = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/health/`);
      setDbStatus({
        status: response.data.database_status === 'ok' ? 'connected' : 'error',
        lastCheck: new Date().toISOString()
      });
    } catch (err) {
      setDbStatus({
        status: 'error',
        lastCheck: new Date().toISOString()
      });
    }
  };

  const checkBackupStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/backup/status/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackupStatus(response.data);
    } catch (err) {
      setBackupStatus({
        reports: 'error',
        database: 'error'
      });
    }
  };

  const runBackup = async (target = 'all') => {
    try {
      setRunningBackup(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/backup/run/`,
        { target },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // After running, refresh status and list
      await checkBackupStatus();
      await listBackups();
      alert(response.message || 'Backup iniciado com sucesso');
    } catch (err) {
      console.error('Erro ao executar backup:', err);
      alert('Erro ao executar backup: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRunningBackup(false);
    }
  };

  const listBackups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/backup/list/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBackupsList(response.data.results || response.data || []);
    } catch (err) {
      console.error('Erro ao listar backups:', err);
      setBackupsList([]);
    }
  };

  if (loading) {
    return (
      <div className="monitoring-loading">
        <div className="spinner"></div>
        <span>Carregando dados...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="monitoring-error">
        <div className="error-icon">⚠️</div>
        <h3>Erro ao carregar dados</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="monitoring-container">
      <PdfGenerationAnimation visible={isGeneratingPdf} />
      {/* Cabeçalho com informações do usuário */}
      <header className="monitoring-header">
        <div className="user-info">
          <div className="user-avatar">{userData?.username?.charAt(0)?.toUpperCase()}</div>
          <div className="user-details">
            <h2>{userData?.username}</h2>
            <p>{churchData?.nome}</p>
          </div>
        </div>

        {/* Controles principais */}
        <div className="monitoring-controls">
          <button 
            className={`control-button ${customDateRange.start ? 'active' : ''}`}
            onClick={() => setPeriodModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {customDateRange.start 
              ? `${formatDateForApi(customDateRange.start)} - ${formatDateForApi(customDateRange.end)}`
              : `${periodMonths} meses`}
          </button>

          <button 
            className={`control-button ${selectedCompareMonths.length > 0 ? 'active' : ''}`}
            onClick={() => setMonthsModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M16 3v4M8 3v4M4 11h16M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
            {selectedCompareMonths.length 
              ? `${selectedCompareMonths.length} meses selecionados`
              : 'Selecionar meses'}
          </button>

          <button 
            className="control-button"
            onClick={() => setBackupModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 15V3m0 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Backup e Relatórios
          </button>
        </div>

        {/* Modal de Período */}
        {periodModalOpen && (
          <div className="modal-overlay" onClick={() => setPeriodModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Selecionar Período</h3>
                <button className="modal-close" onClick={() => setPeriodModalOpen(false)}>×</button>
              </div>
              
              <div className="period-selector">
                <button 
                  className={`period-button ${periodMonths === 3 && !customDateRange.start ? 'active' : ''}`}
                  onClick={() => {
                    setPeriodMonths(3);
                    setCustomDateRange({ start: null, end: null });
                  }}
                >
                  3 meses
                </button>
                <button 
                  className={`period-button ${periodMonths === 6 && !customDateRange.start ? 'active' : ''}`}
                  onClick={() => {
                    setPeriodMonths(6);
                    setCustomDateRange({ start: null, end: null });
                  }}
                >
                  6 meses
                </button>
                <button 
                  className={`period-button ${periodMonths === 12 && !customDateRange.start ? 'active' : ''}`}
                  onClick={() => {
                    setPeriodMonths(12);
                    setCustomDateRange({ start: null, end: null });
                  }}
                >
                  12 meses
                </button>
              </div>

              <div className="modal-actions">
                <button 
                  className="modal-button secondary"
                  onClick={() => setPeriodModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="modal-button primary"
                  onClick={() => {
                    setPeriodModalOpen(false);
                    fetchTransactionData(periodMonths);
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Meses */}
        {monthsModalOpen && (
          <div className="modal-overlay" onClick={() => setMonthsModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Selecionar Meses para Comparação</h3>
                <button className="modal-close" onClick={() => setMonthsModalOpen(false)}>×</button>
              </div>

              <div className="months-grid">
                {(availableMonths || []).map(m => (
                  <div 
                    key={m}
                    className={`month-option ${selectedCompareMonths.includes(m) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedCompareMonths(prev => 
                        prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                      );
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={selectedCompareMonths.includes(m)}
                      readOnly 
                    />
                    <span>{m}</span>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <button 
                  className="modal-button secondary"
                  onClick={() => setMonthsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="modal-button primary"
                  onClick={() => setMonthsModalOpen(false)}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Backup */}
        {backupModalOpen && (
          <div className="modal-overlay" onClick={() => setBackupModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Backup e Relatórios</h3>
                <button className="modal-close" onClick={() => setBackupModalOpen(false)}>×</button>
              </div>

              <div className="status-grid" style={{ marginBottom: '24px' }}>
                <div className="status-item">
                  <span className="status-label">Backup de Relatórios</span>
                  <div className="status-value">
                    <span className={`status-indicator ${backupStatus.reports}`}></span>
                    {backupStatus.reports === 'ok' ? 'Atualizado' : 'Desatualizado'}
                  </div>
                </div>

                <div className="status-item">
                  <span className="status-label">Backup do Banco</span>
                  <div className="status-value">
                    <span className={`status-indicator ${backupStatus.database}`}></span>
                    {backupStatus.database === 'ok' ? 'Atualizado' : 'Desatualizado'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button
                  className="modal-button primary"
                  onClick={() => {
                    runBackup('all');
                    setBackupModalOpen(false);
                  }}
                  disabled={runningBackup}
                >
                  {runningBackup ? 'Executando...' : 'Backup Completo'}
                </button>
                <button
                  className="modal-button secondary"
                  onClick={() => {
                    handleGeneratePdf();
                    setBackupModalOpen(false);
                  }}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}
                </button>
              </div>

              {backupsList.length > 0 && (
                <div className="backups-list">
                  <h4 style={{ marginBottom: '12px' }}>Backups Recentes</h4>
                  <div className="backup-items" style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {backupsList.slice(0, 5).map((b, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px',
                        background: '#f8fafc',
                        borderRadius: '6px'
                      }}>
                        <span style={{ fontSize: '13px' }}>{b.name || b.filename || b.id}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {b.created_at || b.created || b.timestamp || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Grid de cards principais */}
      <div className="monitoring-grid">
        {/* Card de Entradas vs Saídas */}
        <div className="monitoring-card wide">
          <h3>Entradas vs Saídas</h3>
          {transactionData?.monthlyTotals && (
            <Line
              data={{
                labels: transactionData.monthlyTotals.map(m => m.month),
                datasets: [
                  selectedMetrics.includes('entradas') && {
                    label: 'Entradas',
                    data: transactionData.monthlyTotals.map(m => m.income),
                    borderColor: '#4ade80',
                    backgroundColor: 'rgba(74, 222, 128, 0.12)',
                    fill: true,
                    tension: 0.3
                  },
                  selectedMetrics.includes('saidas') && {
                    label: 'Saídas',
                    data: transactionData.monthlyTotals.map(m => m.expenses),
                    borderColor: '#f87171',
                    backgroundColor: 'rgba(248, 113, 113, 0.12)',
                    fill: true,
                    tension: 0.3
                  },
                  selectedMetrics.includes('dizimos') && {
                    label: 'Dízimos',
                    data: transactionData.monthlyTotals.map(m => m.dizimos || 0),
                    borderColor: '#60a5fa',
                    backgroundColor: 'rgba(96, 165, 250, 0.12)',
                    fill: true,
                    tension: 0.3
                  },
                  selectedMetrics.includes('ofertas') && {
                    label: 'Ofertas',
                    data: transactionData.monthlyTotals.map(m => m.ofertas || 0),
                    borderColor: '#c084fc',
                    backgroundColor: 'rgba(192, 132, 252, 0.12)',
                    fill: true,
                    tension: 0.3
                  }
                ].filter(Boolean)
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  tooltip: { mode: 'index', intersect: false }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false },
                scales: {
                  x: { title: { display: true, text: 'Mês' } },
                  y: { beginAtZero: true, title: { display: true, text: 'Valor (R$)' } }
                }
              }}
            />
          )}
        </div>

        {/* Card de Dízimos/Ofertas */}
        <div className="monitoring-card">
          <div className="card-header">
            <h3>Composição de Entradas</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 13 }}>Escopo:</label>
              <select value={pieScope} onChange={e => setPieScope(e.target.value)} className="metric-selector">
                <option value="period">Período ({periodMonths} meses)</option>
                {(availableMonths || []).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {transactionData?.composition && (
            <Pie
              data={{
                labels: ['Dízimos', 'Ofertas', 'Outros'],
                datasets: [{
                  data: [
                    transactionData.composition.dizimos,
                    transactionData.composition.ofertas,
                    transactionData.composition.outros || 0
                  ],
                  backgroundColor: [
                    'rgba(79, 140, 255, 0.9)',
                    'rgba(168, 85, 247, 0.9)',
                    'rgba(99, 102, 241, 0.6)'
                  ]
                }]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' }
                }
              }}
            />
          )}
        </div>

        {/* Card de Comparação Mensal */}
        <div className="monitoring-card">
          <h3>Comparação Mensal</h3>
          {/* Build comparison datasets: if user selected months use them, otherwise show the most recent month */}
          {transactionData?.monthlyTotals && (
            (() => {
              const metricLabels = ['Entradas', 'Saídas', 'Dízimos', 'Ofertas', 'Outros'];
              const colorPalette = [
                'rgba(79,140,255,0.9)',
                'rgba(168,85,247,0.9)',
                'rgba(74,222,128,0.9)',
                'rgba(248,113,113,0.9)',
                'rgba(251,191,36,0.9)',
                'rgba(99,102,241,0.9)'
              ];

              const compareMonthsToUse = (selectedCompareMonths && selectedCompareMonths.length > 0)
                ? selectedCompareMonths
                : [transactionData.monthlyTotals[transactionData.monthlyTotals.length - 1].month];

              const datasets = compareMonthsToUse.map((m, idx) => {
                const monthData = transactionData.monthlyTotals.find(x => x.month === m) || {};
                const baseColor = colorPalette[idx % colorPalette.length];
                // make a semi-opaque background and solid border
                const background = baseColor.replace(/0\.9\)/, '0.5)') || baseColor;
                const borderColor = baseColor.replace(/0\.9\)/, '1)') || baseColor;
                return {
                  label: m,
                  data: [
                    monthData.income || 0,
                    monthData.expenses || 0,
                    monthData.dizimos || 0,
                    monthData.ofertas || 0,
                    monthData.outros || 0
                  ],
                  backgroundColor: background,
                  borderColor: borderColor,
                  borderWidth: 1
                };
              });

              const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

              return (
                <Bar
                  data={{ labels: metricLabels, datasets }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `${ctx.dataset.label}: ${currencyFormatter.format(ctx.raw)}`
                        }
                      }
                    },
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                      x: { stacked: false },
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => currencyFormatter.format(value)
                        }
                      }
                    }
                  }}
                />
              );
            })()
          )}
        </div>

        {/* Card de Status e Backup */}
        <div className="monitoring-card status-card">
          <h3>Status do Sistema</h3>
          
          {/* Status Grid */}
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Conexão com Banco de Dados</span>
              <div className="status-value">
                <span className={`status-indicator ${dbStatus.status}`}></span>
                {dbStatus.status === 'connected' ? 'Conectado' : 'Erro'}
              </div>
            </div>

            <div className="status-item">
              <span className="status-label">Backup de Relatórios</span>
              <div className="status-value">
                <span className={`status-indicator ${backupStatus.reports}`}></span>
                {backupStatus.reports === 'ok' ? 'Atualizado' : 'Desatualizado'}
              </div>
            </div>

            <div className="status-item">
              <span className="status-label">Backup do Banco de Dados</span>
              <div className="status-value">
                <span className={`status-indicator ${backupStatus.database}`}></span>
                {backupStatus.database === 'ok' ? 'Atualizado' : 'Desatualizado'}
              </div>
            </div>
          </div>

          {/* Ações de Backup e Relatório */}
          <div className="backup-actions">
            <h4>Ações</h4>
            <div className="action-buttons">
              <button
                className="action-btn pdf"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {isGeneratingPdf ? 'Gerando...' : 'Relatório PDF'}
              </button>

              <button 
                className="action-btn backup" 
                onClick={() => runBackup('all')} 
                disabled={runningBackup}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 15V3m0 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {runningBackup ? 'Executando...' : 'Backup Completo'}
              </button>

              <button 
                className="action-btn check"
                onClick={checkDatabaseConnection}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Verificar Status
              </button>
            </div>

            {/* Lista de Backups Recentes */}
            {backupsList.length > 0 && (
              <div className="backups-list">
                <h4>Backups Recentes</h4>
                <div className="backup-items">
                  {backupsList.slice(0, 5).map((b, idx) => (
                    <div key={idx} className="backup-item">
                      <span className="backup-name">{b.name || b.filename || b.id}</span>
                      <span className="backup-date">{b.created_at || b.created || b.timestamp || ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;