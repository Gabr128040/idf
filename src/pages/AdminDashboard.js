import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import IgrejaSelector from '../components/IgrejaSelector';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import ConfirmationModal from '../components/ConfirmationModal';
import Notification from '../components/Notification';
import RelatorioList from '../components/RelatorioList';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../pages/Dashboard.css';

const AdminDashboard = () => {
  const [igrejas, setIgrejas] = useState([]);
  const [selectedIgreja, setSelectedIgreja] = useState(null);
  const [showIgrejaForm, setShowIgrejaForm] = useState(false);
  const [igrejaFormData, setIgrejaFormData] = useState({ nome: '', lider: '' });
  const [editIgrejaId, setEditIgrejaId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [refreshTransacoes, setRefreshTransacoes] = useState(false);
  const [showTransacaoModal, setShowTransacaoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // Para criar/editar/deletar
  const [error, setError] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [saldoLoading, setSaldoLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const navigate = useNavigate();

  const fetchIgrejas = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/igrejas/`);
      const data = await res.json();
      setIgrejas(data);
      if (!selectedIgreja && data.length > 0) {
        setSelectedIgreja(data[0]);
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao carregar igrejas.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchIgrejas()
      .catch(() => setError('Erro ao carregar igrejas.'))
      .finally(() => setLoading(false));
  }, []);

  // Busca saldo da igreja selecionada
  useEffect(() => {
    const fetchSaldo = async () => {
      if (!selectedIgreja) {
        setSaldo(null);
        setSaldoLoading(false);
        return;
      }
      setSaldoLoading(true);
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/saldo/?igreja_id=${selectedIgreja.id}`);
        const data = await res.json();
        setSaldo(data.saldo !== undefined ? data.saldo : null);
      } catch (err) {
        setSaldo(null);
      } finally {
        setSaldoLoading(false);
      }
    };
    fetchSaldo();
  }, [selectedIgreja, refreshTransacoes]);

  // Busca transações da igreja selecionada
  useEffect(() => {
    if (!selectedIgreja) {
      setTransactions([]);
      return;
    }
    const fetchTransactions = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/${selectedIgreja.id}/transacoes/`);
        // Ordenar do mais recente para o mais antigo
        const sorted = res.data.sort((a, b) => new Date(b.data) - new Date(a.data));
        setTransactions(sorted);
      } catch (err) {
        setTransactions([]);
      }
    };
    fetchTransactions();
  }, [selectedIgreja, refreshTransacoes]);

  const handleSelectIgreja = (igrejaId) => {
    const igreja = igrejas.find(i => i.id === parseInt(igrejaId));
    setSelectedIgreja(igreja);
  };

  const handleIgrejaFormChange = (e) => {
    setIgrejaFormData({ ...igrejaFormData, [e.target.name]: e.target.value });
  };

  const handleCreateIgreja = () => {
    setEditIgrejaId(null);
    setIgrejaFormData({ nome: '', lider: '' });
    setShowIgrejaForm(true);
  };

  const handleEditIgreja = (igreja) => {
    setEditIgrejaId(igreja.id);
    setIgrejaFormData({ nome: igreja.nome, lider: igreja.lider });
    setShowIgrejaForm(true);
  };

  const handleDeleteIgreja = () => {
    setShowDeleteModal(true);
  };

  const submitIgrejaForm = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const method = editIgrejaId ? 'PUT' : 'POST';
      const url = editIgrejaId
        ? `${process.env.REACT_APP_API_URL}/api/igrejas/${editIgrejaId}/`
        : `${process.env.REACT_APP_API_URL}/api/igrejas/`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(igrejaFormData),
      });
      if (!res.ok) throw new Error('Erro ao salvar igreja.');
      setNotification({ type: 'success', message: 'Igreja salva com sucesso.' });
      setShowIgrejaForm(false);
      fetchIgrejas();
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteIgreja = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
      navigate('/login');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/igrejas/${selectedIgreja.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.status === 401) {
        setNotification({ type: 'error', message: 'Sessão expirada. Faça login novamente.' });
        navigate('/login');
        return;
      }
      if (!res.ok) throw new Error('Erro ao deletar igreja.');
      setNotification({ type: 'success', message: 'Igreja deletada.' });
      setShowDeleteModal(false);
      setSelectedIgreja(null);
      fetchIgrejas();
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao deletar igreja.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTransacao = () => {
    setRefreshTransacoes(!refreshTransacoes);
  };

  // Função para atualizar transações
  const atualizarTransacoes = () => setRefreshTransacoes((v) => !v);

  if (loading) {
    return (
      <div className="zz-spinner-absolute-center">
        <div className="zz-spinner" />
        <span style={{ color: '#4f8cff', fontWeight: 500, marginTop: 18 }}>Carregando igrejas...</span>
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
    );
  }
  if (error) {
    return <div style={{ color: '#e74c3c', textAlign: 'center', margin: '32px 0 18px 0', fontWeight: 500 }}>{error}</div>;
  }
  if (!igrejas.length) {
    return <div style={{ textAlign: 'center', marginTop: 18 }}>Nenhuma igreja encontrada.</div>;
  }

  return (
    <div className="admin-dashboard-zz">
      {actionLoading && (
        <div className="zz-action-overlay zz-spinner-absolute-center">
          <div className="zz-spinner" />
          <span style={{marginTop:18, color:'#4f8cff', fontWeight:600}}>Processando...</span>
        </div>
      )}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="igreja-admin-bar zz-bar">
        <div className="igreja-selector-zz">
          <IgrejaSelector
            igrejas={igrejas}
            selectedIgreja={selectedIgreja}
            onSelect={handleSelectIgreja}
          />
        </div>
        <button className="zz-btn zz-btn-primary" onClick={handleCreateIgreja}>Nova Igreja</button>
        {selectedIgreja && (
          <>
            {/* Desktop: botões ao lado */}
            <span className="zz-actions-desktop">
              <button className="zz-btn zz-btn-secondary" onClick={() => handleEditIgreja(selectedIgreja)}>Editar</button>
              <button className="zz-btn zz-btn-danger" onClick={handleDeleteIgreja}>Deletar</button>
            </span>
            {/* Mobile: botão Editar ao lado do seletor */}
            <button className="zz-btn zz-btn-secondary zz-edit-mobile" onClick={() => handleEditIgreja(selectedIgreja)}>Editar</button>
          </>
        )}
      </div>
      <div className="zz-main-content">
        {selectedIgreja && (
          <div className="igreja-info zz-info-card zz-info-flex">
            <div className="zz-info-main">
              <div className="zz-info-title">{selectedIgreja.nome}</div>
              <div className="zz-info-lider">Líder: <b>{selectedIgreja.lider}</b></div>
            </div>
            <div className="zz-info-saldo">
              <span className="zz-saldo-label">Saldo</span>
              <span className="zz-saldo-value">{saldoLoading ? <span className="zz-saldo-loading" /> : saldo === null ? <span className="zz-saldo-loading" /> : `R$ ${Number(saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span>
            </div>
          </div>
        )}
        {selectedIgreja && (
          <div className="transacoes-section zz-transacoes" style={{padding: '18px 18px 0 18px'}}>
            <div className="zz-transacoes-header">
              <span className="zz-transacoes-title">Transações</span>
              <button className="zz-btn zz-btn-primary" onClick={() => setShowTransacaoModal(true)}>Nova Transação</button>
            </div>
            {showTransacaoModal && (
              <div className="zz-modal-bg" onClick={e => e.target === e.currentTarget && setShowTransacaoModal(false)}>
                <div onClick={e => e.stopPropagation()}>
                  <TransactionForm
                    igrejaId={selectedIgreja.id}
                    onSuccess={() => { setShowTransacaoModal(false); handleCreateTransacao(); atualizarTransacoes(); }}
                    onCancel={() => setShowTransacaoModal(false)}
                  />
                </div>
              </div>
            )}
            <div style={{marginTop: '10px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: 8}}>
              <TransactionList
                transactions={transactions}
                onRefresh={atualizarTransacoes}
                loadingRefresh={saldoLoading} // pode usar um estado próprio se quiser animação independente
              />
            </div>
            <RelatorioList igrejaId={selectedIgreja.id} />
            <div className="zz-relatorio-erro-center">
              {/* O TransactionList e RelatorioList devem exibir mensagens de erro dentro deste div se necessário */}
            </div>
          </div>
        )}
      </div>
      {/* Mobile: botão Deletar no final da página */}
      {selectedIgreja && (
        <div className="zz-delete-mobile">
          <button className="zz-btn zz-btn-danger" onClick={handleDeleteIgreja}>Deletar Igreja</button>
        </div>
      )}
      <AnimatePresence>
        {showIgrejaForm && (
          <motion.div
            className="zz-modal-bg"
            onClick={e => e.target === e.currentTarget && setShowIgrejaForm(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.form
              className="zz-modal-form"
              onSubmit={submitIgrejaForm}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <h3>{editIgrejaId ? 'Editar Igreja' : 'Nova Igreja'}</h3>
              <label>Nome:
                <input name="nome" value={igrejaFormData.nome} onChange={handleIgrejaFormChange} required />
              </label>
              <label>Líder:
                <input name="lider" value={igrejaFormData.lider} onChange={handleIgrejaFormChange} required />
              </label>
              <div className="zz-form-actions">
                <button type="submit" className="zz-btn zz-btn-primary">Salvar</button>
                <button type="button" className="zz-btn zz-btn-secondary" onClick={() => setShowIgrejaForm(false)}>Cancelar</button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Deletar Igreja"
        message="Tem certeza que deseja deletar esta igreja?"
        onConfirm={confirmDeleteIgreja}
        onClose={() => setShowDeleteModal(false)}
      />
      <style>{`
        .admin-dashboard-zz {
          background: #f7f8fa;
          min-height: 100vh;
          padding: 100px 0 32px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          box-sizing: border-box;
        }
        .zz-bar {
          width: 100%;
          max-width: 600px;
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 18px;
          justify-content: center;
          flex-wrap: wrap;
          z-index: 2;
          position: relative;
        }
        .igreja-selector-zz {
          flex: 1;
          min-width: 180px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .zz-actions-desktop {
          display: inline-flex;
          gap: 10px;
        }
        .zz-edit-mobile {
          display: none;
        }
        .zz-delete-mobile {
          display: none;
        }
        .zz-main-content {
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          align-items: stretch;
        }
        .zz-btn {
          border: none;
          border-radius: 8px;
          padding: 8px 18px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.18s, box-shadow 0.18s;
          box-shadow: 0 2px 8px #0001;
          word-break: keep-all;
        }
        .zz-btn-primary { background: #23272f; color: #fff; }
        .zz-btn-primary:hover { background: #111217; }
        .zz-btn-secondary { background: #f1f3f6; color: #23272f; border: 1px solid #e0e2e7; }
        .zz-btn-secondary:hover { background: #e0e2e7; }
        .zz-btn-danger { background: #ffeded; color: #c0392b; }
        .zz-btn-danger:hover { background: #ffd6d6; }
        .zz-hide-mobile { display: inline-block; }
        .zz-modal-bg {
          background: rgba(0,0,0,0.18);
          position: fixed;
          top:0; left:0; width:100vw; height:100vh;
          display:flex; align-items:center; justify-content:center;
          z-index:1000;
        }
        .zz-modal-form {
          background: #fff;
          padding: 32px 24px;
          border-radius: 16px;
          box-shadow: 0 2px 16px #0002;
          min-width: 320px;
          max-width: 95vw;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .zz-form-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          justify-content: flex-end;
        }
        .zz-info-card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 2px 8px #0001;
          padding: 18px 24px;
          margin-bottom: 0;
          width: 100%;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          border: 1px solid #f0f1f3;
          word-break: break-word;
          overflow-x: auto;
        }
        .zz-info-flex {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }
        .zz-info-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .zz-info-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #23272f;
          margin-bottom: 4px;
        }
        .zz-info-lider {
          font-size: 1rem;
          color: #444;
        }
        .zz-info-saldo {
          background: #f7fafc;
          border-radius: 10px;
          box-shadow: 0 1px 6px #4f8cff11;
          padding: 12px 22px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 120px;
        }
        .zz-saldo-label {
          color: #4f8cff;
          font-size: 0.98rem;
          font-weight: 600;
          margin-bottom: 2px;
        }
        .zz-saldo-value {
          color: #23272f;
          font-size: 1.18rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .zz-saldo-loading {
          display: inline-block;
          width: 22px;
          height: 22px;
          border: 3px solid #e3e9f7;
          border-top: 3px solid #4f8cff;
          border-radius: 50%;
          animation: zz-spin 0.9s linear infinite;
        }
        .zz-transacoes {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 2px 8px #0001;
          padding: 18px 0 0 0;
          width: 100%;
          max-width: 100%;
          border: 1px solid #f0f1f3;
          overflow-x: auto;
        }
        .zz-transacoes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          padding: 0 18px;
          gap: 8px;
        }
        .zz-transacoes-title {
          font-size: 1.08rem;
          font-weight: 600;
          color: #23272f;
        }
        .zz-refresh-icon-btn:active { background: #e3e9f7; }
        @keyframes zz-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .zz-relatorio-erro-center {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        @media (max-width: 1000px) {
          .zz-dashboard-split {
            flex-direction: column;
            gap: 18px;
            max-width: 98vw;
          }
          .zz-dashboard-panel, .zz-dashboard-transacoes {
            min-width: 0;
            max-width: 100vw;
            border-radius: 12px;
            box-shadow: 0 1px 8px #0001;
            padding-left: 10px;
            padding-right: 10px;
          }
        }
        @keyframes zz-fadein {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
