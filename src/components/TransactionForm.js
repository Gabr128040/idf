import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import './TransactionForm.css';

const TransactionForm = ({ igrejaId, onTransactionAdded, setNotification, onCancel, isOpen }) => {
  const modalRef = useRef(null);
  // Adicionar o efeito para fechar o modal quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onCancel && onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  const [formData, setFormData] = useState({
    tipo: 'D',
    quantia: '',
    data: '',
    nome: '',
    culto: '',
    tipo_despesa: '',
    descricao: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formattedData = {
        ...formData,
        quantia: parseFloat(formData.quantia) || 0,
        culto: formData.culto || null,
        tipo_despesa: formData.tipo_despesa || null,
        nome: formData.nome || null,
        descricao: formData.descricao || null,
        igreja: igrejaId,
      };
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/transacoes/nova/`,
        {
          ...formattedData,
          igreja_id: igrejaId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      setNotification && setNotification({ message: 'Transação adicionada com sucesso!', type: 'success' });
      onTransactionAdded && onTransactionAdded();
      setFormData({ tipo: 'D', quantia: '', data: '', nome: '', culto: '', tipo_despesa: '', descricao: '' });
      onCancel && onCancel();
    } catch (error) {
      setNotification && setNotification({ message: 'Erro ao adicionar transação: ' + (error.response?.data?.detail || error.message), type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={e => { if (e.target.classList.contains('modal-overlay')) onCancel && onCancel(); }}>
      <motion.div
        ref={modalRef}
        className="modal-content transaction-form"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={e => e.stopPropagation()}
      >
        <h3>Nova Transação</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-content">
            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select name="tipo" value={formData.tipo} onChange={handleChange} className="form-input">
                  <option value="D">Dízimo</option>
                  <option value="O">Oferta</option>
                  <option value="S">Despesa</option>
                </select>
              </div>
              <div className="form-group">
                <label>Quantia (R$)</label>
                <input
                  type="number"
                  name="quantia"
                  placeholder="0,00"
                  value={formData.quantia}
                  onChange={handleChange}
                  step="0.01"
                  required
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Data</label>
                <input
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  required
                  className="form-input"
                />
              </div>
              {formData.tipo === 'D' && (
                <div className="form-group">
                  <label>Contribuinte</label>
                  <input
                    type="text"
                    name="nome"
                    placeholder="Nome do Contribuinte"
                    value={formData.nome}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              )}
              {formData.tipo === 'O' && (
                <div className="form-group">
                  <label>Culto</label>
                  <select name="culto" value={formData.culto} onChange={handleChange} className="form-input">
                    <option value="">Selecione</option>
                    <option value="CV">Culto da Vitória</option>
                    <option value="EBD">EBD</option>
                    <option value="GR">Gratidão</option>
                    <option value="LR">Lar</option>
                    <option value="FM">Família</option>
                    <option value="DP">Departamento</option>
                    <option value="OT">Outro</option>
                  </select>
                </div>
              )}
              {formData.tipo === 'S' && (
                <div className="form-group">
                  <label>Tipo de Despesa</label>
                  <select name="tipo_despesa" value={formData.tipo_despesa} onChange={handleChange} className="form-input">
                    <option value="">Selecione</option>
                    <option value="CT">Conta</option>
                    <option value="IN">Insumo</option>
                    <option value="OT">Outro</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label>Descrição</label>
              <textarea
                name="descricao"
                placeholder="Descrição"
                value={formData.descricao}
                onChange={handleChange}
                className="form-input"
                rows={2}
              />
            </div>
          </div>
          
          <div className="modal-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Salvar'}
            </button>
            <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 16px;
        }
        
        .modal-content {
          background-color: white;
          border-radius: 10px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          overflow: hidden;
        }
        
        .transaction-form h3 {
          padding: 20px 24px;
          font-size: 1.2rem;
          color: var(--neutral-800, #1f2937);
          border-bottom: 1px solid var(--neutral-200, #e5e7eb);
          margin: 0;
          text-align: center;
        }
        
        .form-content {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .form-row {
          display: flex;
          gap: 16px;
          width: 100%;
        }
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        
        .form-group label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--neutral-700, #374151);
        }
        
        .form-input {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--neutral-300, #d1d5db);
          font-size: 0.95rem;
          transition: all 0.2s ease;
          background-color: white;
        }
        
        .form-input:focus {
          outline: none;
          border-color: var(--primary, #4361ee);
          box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
        }
        
        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 30px;
        }
        
        .modal-actions {
          padding: 16px 24px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid var(--neutral-200, #e5e7eb);
        }
        
        .btn-primary {
          background-color: var(--primary, #4361ee);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .btn-primary:hover {
          background-color: var(--primary-dark, #3f37c9);
        }
        
        .btn-outline {
          background-color: white;
          color: var(--neutral-700, #374151);
          border: 1px solid var(--neutral-300, #d1d5db);
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-outline:hover {
          background-color: var(--neutral-100, #f3f4f6);
        }
        
        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 576px) {
          .form-row {
            flex-direction: column;
            gap: 16px;
          }
          
          .modal-actions {
            flex-direction: column;
            gap: 8px;
          }
          
          .btn-primary, .btn-outline {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default TransactionForm;