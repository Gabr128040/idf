
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import './TransactionForm.css';

const TransactionForm = ({ igrejaId, onTransactionAdded, setNotification, onCancel, isOpen }) => {
  const modalRef = useRef(null);
  
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

  const [step, setStep] = useState(1); // 1: escolher entrada/saída, 2: formulário
  const [transactionType, setTransactionType] = useState(''); // 'entrada' ou 'saida'
  const [formData, setFormData] = useState({
    valor: '',
    data: '',
    discriminacao: '',
    tipoEntrada: '', // 'oferta', 'dizimo', 'outro'
    naoAgrupar: false,
  });
  const [loading, setLoading] = useState(false);

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSetCurrentDate = () => {
    setFormData({ ...formData, data: getCurrentDate() });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
  };

  const handleTypeSelection = (type) => {
    setTransactionType(type);
    setStep(2);
    // Reset form data quando muda o tipo
    setFormData({
      valor: '',
      data: '',
      discriminacao: '',
      tipoEntrada: type === 'entrada' ? 'dizimo' : '',
      naoAgrupar: false,
    });
  };

  const handleBack = () => {
    setStep(1);
    setTransactionType('');
    setFormData({
      valor: '',
      data: '',
      discriminacao: '',
      tipoEntrada: '',
      naoAgrupar: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações
    if (transactionType === 'entrada' && formData.tipoEntrada === 'outro' && !formData.discriminacao.trim()) {
      setNotification && setNotification({ 
        message: 'Discriminação é obrigatória para transações do tipo "Outro"', 
        type: 'error' 
      });
      return;
    }
    
    if (transactionType === 'saida' && !formData.discriminacao.trim()) {
      setNotification && setNotification({ 
        message: 'Discriminação é obrigatória para saídas', 
        type: 'error' 
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Mapear dados para o formato esperado pelo backend
      const backendData = {
        quantia: parseFloat(formData.valor) || 0,
        data: formData.data,
        descricao: formData.discriminacao || null,
        igreja: igrejaId,
        igreja_id: igrejaId,
      };

      if (transactionType === 'entrada') {
        if (formData.tipoEntrada === 'dizimo') {
          backendData.tipo = 'D';
          backendData.nome = null;
          backendData.nao_agrupar = formData.naoAgrupar;
        } else if (formData.tipoEntrada === 'oferta') {
          backendData.tipo = 'O';
          backendData.culto = null;
          backendData.nao_agrupar = formData.naoAgrupar;
        } else if (formData.tipoEntrada === 'outro') {
          backendData.tipo = 'O'; // Tratamos "outro" como oferta especial
          backendData.culto = 'OT';
          backendData.nao_agrupar = true; // Sempre não agrupa para "outro"
        }
      } else {
        backendData.tipo = 'S';
        backendData.nao_agrupar = true; // Saídas nunca são agrupadas
      }

      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/transacoes/nova/`,
        backendData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      setNotification && setNotification({ 
        message: 'Transação adicionada com sucesso!', 
        type: 'success' 
      });
      onTransactionAdded && onTransactionAdded();
      setStep(1);
      setTransactionType('');
      setFormData({
        valor: '',
        data: '',
        discriminacao: '',
        tipoEntrada: '',
        naoAgrupar: false,
      });
      onCancel && onCancel();
    } catch (error) {
      setNotification && setNotification({ 
        message: 'Erro ao adicionar transação: ' + (error.response?.data?.detail || error.message), 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <div className="transaction-type-selection">
      <h3>Nova Transação</h3>
      <p>Escolha o tipo de transação:</p>
      <div className="type-buttons">
        <button
          type="button"
          className="type-btn entrada-btn"
          onClick={() => handleTypeSelection('entrada')}
        >
          <div className="type-icon">+</div>
          <div className="type-label">Entrada</div>
          <div className="type-desc">Dízimos, Ofertas, Outros</div>
        </button>
        <button
          type="button"
          className="type-btn saida-btn"
          onClick={() => handleTypeSelection('saida')}
        >
          <div className="type-icon">-</div>
          <div className="type-label">Saída</div>
          <div className="type-desc">Despesas</div>
        </button>
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div className="transaction-form-content">
      <div className="form-header">
        <button type="button" className="back-btn" onClick={handleBack}>
          ← Voltar
        </button>
        <h3>
          Nova {transactionType === 'entrada' ? 'Entrada' : 'Saída'}
        </h3>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="form-content">
          {/* Valor */}
          <div className="form-group">
            <label>Valor (R$)</label>
            <input
              type="number"
              name="valor"
              placeholder="0,00"
              value={formData.valor}
              onChange={handleChange}
              step="0.01"
              required
              className="form-input"
            />
          </div>

          {/* Data */}
          <div className="form-group">
            <label>Data</label>
            <div className="date-input-group">
              <input
                type="date"
                name="data"
                value={formData.data}
                onChange={handleChange}
                required
                className="form-input"
              />
              <button
                type="button"
                className="current-date-btn"
                onClick={handleSetCurrentDate}
                title="Usar data atual"
              >
                Hoje
              </button>
            </div>
          </div>

          {/* Discriminação */}
          <div className="form-group">
            <label>
              Discriminação
              {((transactionType === 'entrada' && formData.tipoEntrada === 'outro') || transactionType === 'saida') && (
                <span className="required-indicator"> *</span>
              )}
            </label>
            <input
              type="text"
              name="discriminacao"
              placeholder="Descrição da transação"
              value={formData.discriminacao}
              onChange={handleChange}
              className="form-input"
              required={(transactionType === 'entrada' && formData.tipoEntrada === 'outro') || transactionType === 'saida'}
            />
          </div>

          {/* Seletor de tipo para entradas */}
          {transactionType === 'entrada' && (
            <div className="form-group">
              <label>Tipo</label>
              <select 
                name="tipoEntrada" 
                value={formData.tipoEntrada} 
                onChange={handleChange} 
                className="form-input"
                required
              >
                <option value="dizimo">Dízimo</option>
                <option value="oferta">Oferta</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          )}

          {/* Checkbox "Não agrupar" - só aparece para dízimo e oferta */}
          {transactionType === 'entrada' && (formData.tipoEntrada === 'dizimo' || formData.tipoEntrada === 'oferta') && (
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="naoAgrupar"
                  checked={formData.naoAgrupar}
                  onChange={handleChange}
                  className="checkbox-input"
                />
                <span className="checkbox-text">Não agrupar no PDF</span>
              </label>
              <small className="checkbox-help">
                Por padrão, {formData.tipoEntrada === 'dizimo' ? 'dízimos' : 'ofertas'} do mesmo dia são agrupados no PDF
              </small>
            </div>
          )}

          
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
    </div>
  );
  
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
        {step === 1 ? renderStepOne() : renderStepTwo()}
      </motion.div>
      
      <style>{`
        .transaction-type-selection {
          padding: 24px;
          text-align: center;
        }
        
        .transaction-type-selection h3 {
          margin: 0 0 8px 0;
          color: var(--neutral-800, #1f2937);
          font-size: 1.3rem;
        }
        
        .transaction-type-selection p {
          margin: 0 0 24px 0;
          color: var(--neutral-600, #6b7280);
          font-size: 1rem;
        }
        
        .type-buttons {
          display: flex;
          gap: 20px;
          justify-content: center;
        }
        
        .type-btn {
          background: white;
          border: 2px solid var(--neutral-200, #e5e7eb);
          border-radius: 16px;
          padding: 24px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .type-btn:hover {
          border-color: var(--primary, #4361ee);
          box-shadow: 0 4px 12px rgba(67, 97, 238, 0.15);
        }
        
        .entrada-btn:hover {
          border-color: #27ae60;
          box-shadow: 0 4px 12px rgba(39, 174, 96, 0.15);
        }
        
        .saida-btn:hover {
          border-color: #e74c3c;
          box-shadow: 0 4px 12px rgba(231, 76, 60, 0.15);
        }
        
        .type-icon {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          color: white;
        }
        
        .entrada-btn .type-icon {
          background: #27ae60;
        }
        
        .saida-btn .type-icon {
          background: #e74c3c;
        }
        
        .type-label {
          font-weight: 600;
          font-size: 1.1rem;
          color: var(--neutral-800, #1f2937);
        }
        
        .type-desc {
          font-size: 0.9rem;
          color: var(--neutral-500, #9ca3af);
        }
        
        .form-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px 0 24px;
          margin-bottom: 20px;
        }
        
        .back-btn {
          background: none;
          border: none;
          color: var(--primary, #4361ee);
          font-size: 1rem;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background-color 0.2s;
        }
        
        .back-btn:hover {
          background: var(--neutral-100, #f3f4f6);
        }
        
        .form-header h3 {
          margin: 0;
          color: var(--neutral-800, #1f2937);
          font-size: 1.2rem;
        }
        
        .date-input-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .date-input-group .form-input {
          flex: 1;
        }
        
        .current-date-btn {
          background: var(--neutral-100, #f3f4f6);
          border: 1px solid var(--neutral-300, #d1d5db);
          color: var(--neutral-700, #374151);
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .current-date-btn:hover {
          background: var(--neutral-200, #e5e7eb);
          border-color: var(--neutral-400, #9ca3af);
        }
        
        .checkbox-group {
          padding: 16px;
          background: var(--neutral-50, #f9fafb);
          border-radius: 8px;
          border: 1px solid var(--neutral-200, #e5e7eb);
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          margin-bottom: 4px;
        }
        
        .checkbox-input {
          width: 18px;
          height: 18px;
          accent-color: var(--primary, #4361ee);
        }
        
        .checkbox-text {
          font-weight: 500;
          color: var(--neutral-700, #374151);
        }
        
        .checkbox-help {
          color: var(--neutral-500, #9ca3af);
          font-size: 0.85rem;
          margin-left: 26px;
          line-height: 1.4;
        }
        
        .required-indicator {
          color: #e74c3c;
          font-weight: bold;
        }
        
        @media (max-width: 576px) {
          .type-buttons {
            flex-direction: column;
            gap: 16px;
          }
          
          .type-btn {
            min-width: auto;
            width: 100%;
          }
          
          .date-input-group {
            flex-direction: column;
            gap: 8px;
          }
          
          .date-input-group .form-input,
          .current-date-btn {
            width: 100%;
          }
        }
        
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
        
        .transaction-form-content h3 {
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
        
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
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
      `}</style>
    </div>
  );
};

export default TransactionForm;
