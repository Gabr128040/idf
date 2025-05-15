import React, { useEffect, useState } from 'react';
import IgrejaSelector from '../components/IgrejaSelector';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import ConfirmationModal from '../components/ConfirmationModal';
import Notification from '../components/Notification';
import RelatorioList from '../components/RelatorioList';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  useEffect(() => {
    // Corrige: aceita tanto superuser quanto is_igreja_admin
    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (!localUser || (!localUser.is_superuser && !localUser.is_igreja_admin)) {
      navigate('/');
    }
    fetchIgrejas();
  }, []);

  const fetchIgrejas = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/igrejas/`);
      const data = await res.json();
      setIgrejas(data);
      if (!selectedIgreja && data.length > 0) {
        setSelectedIgreja(data[0]);
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao carregar igrejas.' });
    }
  };

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
    console.log(igrejaFormData)
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
    }
  };

  const confirmDeleteIgreja = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/igrejas/${selectedIgreja.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Erro ao deletar igreja.');
      setNotification({ type: 'success', message: 'Igreja deletada.' });
      setShowDeleteModal(false);
      setSelectedIgreja(null);
      fetchIgrejas();
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro ao deletar igreja.' });
    }
  };

  const handleCreateTransacao = () => {
    setRefreshTransacoes(!refreshTransacoes);
  };

  return (
    <div className="admin-dashboard-zz">
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
          <div className="igreja-info zz-info-card">
            <div className="zz-info-title">{selectedIgreja.nome}</div>
            <div className="zz-info-lider">Líder: <b>{selectedIgreja.lider}</b></div>
          </div>
        )}
        {selectedIgreja && (
          <div className="transacoes-section zz-transacoes">
            <div className="zz-transacoes-header">
              <span className="zz-transacoes-title">Transações</span>
              <button className="zz-btn zz-btn-primary" onClick={() => setShowTransacaoModal(true)}>Nova Transação</button>
            </div>
            {showTransacaoModal && (
              <div className="zz-modal-bg">
                <TransactionForm igrejaId={selectedIgreja.id} onSuccess={() => { setShowTransacaoModal(false); handleCreateTransacao(); }} onCancel={() => setShowTransacaoModal(false)} />
              </div>
            )}
            <TransactionList igrejaId={selectedIgreja.id} refresh={refreshTransacoes} />
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
      {showIgrejaForm && (
        <div className="zz-modal-bg">
          <form className="zz-modal-form" onSubmit={submitIgrejaForm}>
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
          </form>
        </div>
      )}
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
        .zz-relatorio-erro-center {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        @media (max-width: 600px) {
          .admin-dashboard-zz {
            padding: 80px 0 12px 0;
          }
          .zz-bar, .zz-main-content, .zz-info-card, .zz-transacoes {
            max-width: 100vw;
            min-width: 0;
            border-radius: 0;
            box-shadow: none;
            padding-left: 22px;
            padding-right: 22px;
          }
          .zz-bar {
            padding-left: 18px;
            padding-right: 18px;
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .zz-actions-desktop {
            display: none !important;
          }
          .zz-edit-mobile {
            display: inline-block;
            margin-left: 8px;
            margin-top: 0;
            vertical-align: middle;
          }
          .zz-delete-mobile {
            display: flex;
            width: 100vw;
            justify-content: center;
            margin: 24px 0 12px 0;
            padding-left: 22px;
            padding-right: 22px;
          }
          .zz-delete-mobile .zz-btn-danger {
            width: 100%;
            max-width: 500px;
            font-size: 1.08rem;
            padding: 12px 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
