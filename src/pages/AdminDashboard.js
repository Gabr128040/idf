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
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [igrejas, setIgrejas] = useState([]);
  const [selectedIgreja, setSelectedIgreja] = useState(null);
  const [showIgrejaForm, setShowIgrejaForm] = useState(false);
  const [igrejaFormData, setIgrejaFormData] = useState({ nome: '', lider: '' });
  const [editIgrejaId, setEditIgrejaId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showTransacaoModal, setShowTransacaoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saldo, setSaldo] = useState(null);
  const [saldoLoading, setSaldoLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [activePanel, setActivePanel] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchIgrejas = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/`);
        setIgrejas(res.data || []);
        if (!selectedIgreja && res.data && res.data.length) setSelectedIgreja(res.data[0]);
      } catch (err) {
        setNotification({ type: 'error', message: 'Erro ao carregar igrejas.' });
      } finally { setLoading(false); }
    };
    fetchIgrejas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedIgreja) return;
    const fetchData = async () => {
      setSaldoLoading(true);
      try {
        const [saldoRes, transRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/saldo/?igreja_id=${selectedIgreja.id}`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/${selectedIgreja.id}/transacoes/`),
        ]);
        setSaldo(saldoRes.data?.saldo ?? null);
        setTransactions((transRes.data || []).sort((a, b) => new Date(b.data) - new Date(a.data)));
      } catch (err) {
        setSaldo(null);
        setTransactions([]);
      } finally { setSaldoLoading(false); }
    };
    fetchData();
  }, [selectedIgreja]);

  const handleSelectIgreja = (id) => {
    const igreja = igrejas.find(i => String(i.id) === String(id));
    setSelectedIgreja(igreja || null);
  };

  const handleCreateIgreja = () => { setEditIgrejaId(null); setIgrejaFormData({ nome: '', lider: '' }); setShowIgrejaForm(true); };
  const handleEditIgreja = (igreja) => { setEditIgrejaId(igreja.id); setIgrejaFormData({ nome: igreja.nome, lider: igreja.lider }); setShowIgrejaForm(true); };
  const handleDeleteIgreja = () => setShowDeleteModal(true);

  const submitIgrejaForm = async (e) => {
    e.preventDefault();
    try {
      const url = editIgrejaId ? `${process.env.REACT_APP_API_URL}/api/igrejas/${editIgrejaId}/` : `${process.env.REACT_APP_API_URL}/api/igrejas/`;
      const method = editIgrejaId ? 'put' : 'post';
      await axios[method](url, igrejaFormData);
      setNotification({ type: 'success', message: 'Igreja salva com sucesso.' });
      setShowIgrejaForm(false);
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/`);
      setIgrejas(res.data || []);
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao salvar igreja.' });
    }
  };

  const confirmDeleteIgreja = async () => {
    if (!selectedIgreja) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/igrejas/${selectedIgreja.id}/`);
      setNotification({ type: 'success', message: 'Igreja deletada.' });
      setShowDeleteModal(false); setSelectedIgreja(null);
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/`);
      setIgrejas(res.data || []);
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao deletar igreja.' });
    }
  };

  const atualizarTransacoes = () => setTransactions(t => [...t]);

  if (loading) return <div className="zz-spinner-absolute-center"><div className="zz-spinner" /></div>;

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">Painel Admin</div>
        <div className="admin-nav">
          <a href="#overview" onClick={(e) => { e.preventDefault(); setActivePanel('overview'); }} className={activePanel === 'overview' ? 'active' : ''}>Overview</a>
          <a href="#transacoes" onClick={(e) => { e.preventDefault(); setActivePanel('transacoes'); }} className={activePanel === 'transacoes' ? 'active' : ''}>Transações</a>
          <a href="#relatorios" onClick={(e) => { e.preventDefault(); setActivePanel('relatorios'); }} className={activePanel === 'relatorios' ? 'active' : ''}>Relatórios</a>
          <a href="#backups" onClick={(e) => { e.preventDefault(); setActivePanel('backups'); }} className={activePanel === 'backups' ? 'active' : ''}>Backups</a>
          <a href="#db" onClick={(e) => { e.preventDefault(); setActivePanel('db'); }} className={activePanel === 'db' ? 'active' : ''}>Banco de Dados</a>
          <a href="#users" onClick={(e) => { e.preventDefault(); setActivePanel('users'); }} className={activePanel === 'users' ? 'active' : ''}>Usuários</a>
          <a href="#charts" onClick={(e) => { e.preventDefault(); setActivePanel('charts'); }} className={activePanel === 'charts' ? 'active' : ''}>Gráficos</a>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div className="admin-section-title">Sessão</div>
          <button className="zz-btn zz-btn-secondary" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}>Logout</button>
        </div>
      </aside>

      <main className="admin-content">
        <div className="admin-top-row">
          <h2 style={{ margin: 0 }}>Administração</h2>
          <div>
            <button className="zz-btn zz-btn-primary" onClick={handleCreateIgreja}>Nova Igreja</button>
          </div>
        </div>

        {notification && <Notification type={notification.type} message={notification.message} onClose={() => setNotification(null)} />}

        <div className="igreja-admin-bar zz-bar">
          <div className="igreja-selector-zz">
            <IgrejaSelector igrejas={igrejas} selectedIgreja={selectedIgreja} onSelect={handleSelectIgreja} />
          </div>
          <button className="zz-btn zz-btn-primary" onClick={handleCreateIgreja}>Nova Igreja</button>
          {selectedIgreja && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="zz-btn zz-btn-secondary" onClick={() => handleEditIgreja(selectedIgreja)}>Editar</button>
              <button className="zz-btn zz-btn-danger" onClick={handleDeleteIgreja}>Deletar</button>
            </div>
          )}
        </div>

        <div className="zz-main-content">
          {selectedIgreja && (
            <>
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

              <div className="transacoes-section zz-transacoes" style={{ padding: '18px 18px 0 18px' }}>
                <div className="zz-transacoes-header">
                  <span className="zz-transacoes-title">Transações</span>
                  <button className="zz-btn zz-btn-primary" onClick={() => setShowTransacaoModal(true)}>Nova Transação</button>
                </div>

                {showTransacaoModal && (
                  <TransactionForm
                    isOpen={showTransacaoModal}
                    igrejaId={selectedIgreja.id}
                    onSuccess={() => { setShowTransacaoModal(false); atualizarTransacoes(); }}
                    onCancel={() => setShowTransacaoModal(false)}
                  />
                )}

                <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                  <TransactionList transactions={transactions} onRefresh={atualizarTransacoes} loadingRefresh={saldoLoading} />
                </div>

                <RelatorioList igrejaId={selectedIgreja.id} />
              </div>
            </>
          )}
        </div>

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
                  <input name="nome" value={igrejaFormData.nome} onChange={(e) => setIgrejaFormData({ ...igrejaFormData, nome: e.target.value })} required />
                </label>
                <label>Líder:
                  <input name="lider" value={igrejaFormData.lider} onChange={(e) => setIgrejaFormData({ ...igrejaFormData, lider: e.target.value })} required />
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

      </main>
    </div>
  );
};

export default AdminDashboard;
