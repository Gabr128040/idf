
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Relatorios.css';

const Relatorios = () => {
  const navigate = useNavigate();
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [igrejaId, setIgrejaId] = useState(null);
  const [igrejaNome, setIgrejaNome] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Função para formatar tamanho de arquivo
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Função para formatar data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Função para obter nome do mês
  const getMonthName = (monthNumber) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[parseInt(monthNumber) - 1] || 'Mês Inválido';
  };

  useEffect(() => {
    const fetchRelatorios = async () => {
      setLoading(true);
      setError(null);
      try {
        // Buscar perfil do usuário autenticado para obter igrejaId
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Usuário não autenticado');
        
        const meResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/me/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const igreja = meResponse.data.igreja;
        if (!igreja || !igreja.id) throw new Error('Igreja não encontrada no perfil');
        
        setIgrejaId(igreja.id);
        setIgrejaNome(igreja.nome || 'Igreja');
        
        // Buscar relatórios apenas da igreja do usuário
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/${igreja.id}/relatorios/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Ordenar por data de criação (mais recente primeiro)
        const sortedRelatorios = response.data.sort((a, b) => {
          return new Date(b.data_criacao || b.created_at) - new Date(a.data_criacao || a.created_at);
        });
        
        setRelatorios(sortedRelatorios);
      } catch (error) {
        console.error('Erro ao buscar relatórios:', error);
        setError(error.response?.data?.detail || error.message || 'Erro ao buscar relatórios.');
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, []);

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja deletar o relatório "${nome}"?`)) {
      return;
    }
    
    setDeletingId(id);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/relatorios/${id}/deletar/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRelatorios((prevRelatorios) => prevRelatorios.filter((relatorio) => relatorio.id !== id));
      
      // Feedback visual de sucesso
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 9999;
        background: #10b981; color: white; padding: 12px 20px;
        border-radius: 8px; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      notification.textContent = 'Relatório deletado com sucesso!';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      
    } catch (error) {
      console.error('Erro ao deletar relatório:', error);
      alert('Erro ao deletar relatório: ' + (error.response?.data?.detail || error.message));
    } finally {
      setDeletingId(null);
    }
  };

  const LoadingSkeleton = () => (
    <div className="relatorios-grid">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line medium"></div>
          <div className="skeleton-line short"></div>
          <div className="skeleton-line"></div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="relatorios">
        <div className="relatorios-container">
          <button onClick={() => navigate('/')} className="back-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar para Dashboard
          </button>
          
          <div className="relatorios-header">
            <h2>Relatórios Antigos</h2>
          </div>
          
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Carregando relatórios...</p>
          </div>
          
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relatorios">
        <div className="relatorios-container">
          <button onClick={() => navigate('/')} className="back-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar para Dashboard
          </button>
          
          <div className="error-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px', display: 'block' }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <h3>Erro ao carregar relatórios</h3>
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="back-button" style={{ marginTop: '16px' }}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relatorios">
      <div className="relatorios-container">
        <motion.button 
          onClick={() => navigate('/')} 
          className="back-button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Voltar para Dashboard
        </motion.button>
        
        <div className="relatorios-header">
          <h2>Relatórios Financeiros</h2>
          {igrejaNome && <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '8px' }}>{igrejaNome}</p>}
        </div>

        {relatorios.length > 0 && (
          <div className="relatorios-stats">
            <div className="stat-card">
              <span className="stat-number">{relatorios.length}</span>
              <span className="stat-label">Total de Relatórios</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{new Set(relatorios.map(r => r.ano)).size}</span>
              <span className="stat-label">Anos Diferentes</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{relatorios.filter(r => r.ano === new Date().getFullYear()).length}</span>
              <span className="stat-label">Relatórios de {new Date().getFullYear()}</span>
            </div>
          </div>
        )}

        <AnimatePresence>
          {relatorios.length === 0 ? (
            <motion.div 
              className="empty-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="empty-icon">📄</div>
              <div className="empty-title">Nenhum relatório encontrado</div>
              <div className="empty-description">
                Os relatórios gerados aparecerão aqui. Vá para o dashboard para gerar seu primeiro relatório.
              </div>
            </motion.div>
          ) : (
            <div className="relatorios-grid">
              {relatorios.map((relatorio, index) => (
                <motion.div
                  key={relatorio.id}
                  className="relatorio-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ y: -4 }}
                >
                  <div className="relatorio-header">
                    <div className="relatorio-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
                        <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="relatorio-info">
                      <h3 className="relatorio-title">
                        {getMonthName(relatorio.mes)} de {relatorio.ano}
                      </h3>
                      <div className="relatorio-date">
                        {relatorio.data_criacao ? formatDate(relatorio.data_criacao) : 'Data não disponível'}
                      </div>
                      <div className="relatorio-size">
                        {formatFileSize(relatorio.tamanho)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="relatorio-actions">
                    <motion.a 
                      href={relatorio.url} 
                      download={`relatorio_${getMonthName(relatorio.mes).toLowerCase()}_${relatorio.ano}.pdf`}
                      className="download-button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Download
                    </motion.a>
                    
                    <motion.button 
                      onClick={() => handleDelete(relatorio.id, `${getMonthName(relatorio.mes)} de ${relatorio.ano}`)}
                      className="delete-button"
                      disabled={deletingId === relatorio.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {deletingId === relatorio.id ? (
                        <div className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <rect x="5" y="7" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                          <path d="M10 11v4M14 11v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M9 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Relatorios;
