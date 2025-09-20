import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import './TransactionForm.css';

const EditTransactionModal = ({ transaction, onClose, onSave, setNotification }) => {
  const modalRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose && onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Mapear dados da transação existente para o formato do form
  const mapTransactionToFormData = (transaction) => {
    let tipoEntrada = '';
    
    if (transaction.tipo === 'D') {
      tipoEntrada = 'dizimo';
    } else if (transaction.tipo === 'O') {
      // Se é oferta "outro" (culto = 'OT')
      if (transaction.culto === 'OT') {
        tipoEntrada = 'outro';
      } else {
        tipoEntrada = 'oferta';
      }
    }

    return {
      valor: transaction.quantia || '',
      data: transaction.data || '',
      discriminacao: transaction.descricao || transaction.discriminacao || '',
      tipoEntrada,
      naoAgrupar: transaction.nao_agrupar || false,
      // Preservar campos originais para evitar perda de dados
      nome: transaction.nome || '',
      culto: transaction.culto || '',
      tipo_despesa: transaction.tipo_despesa || '',
    };
  };

  const [step, setStep] = useState(2); // Começar direto no passo 2 para edição
  const [transactionType, setTransactionType] = useState(
    transaction.tipo === 'S' ? 'saida' : 'entrada'
  );
  const [formData, setFormData] = useState(mapTransactionToFormData(transaction));
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
      
      // Mapear dados preservando campos originais para evitar perda de dados
      const backendData = {
        quantia: parseFloat(formData.valor) || 0,
        data: formData.data,
        descricao: formData.discriminacao || null,
        // Preservar campos originais
        nome: formData.nome || null,
        culto: formData.culto || null,
        tipo_despesa: formData.tipo_despesa || null,
      };

      if (transactionType === 'entrada') {
        if (formData.tipoEntrada === 'dizimo') {
          backendData.tipo = 'D';
          backendData.nao_agrupar = formData.naoAgrupar;
          // Para dízimos, preservar o nome existente ou deixar null
        } else if (formData.tipoEntrada === 'oferta') {
          backendData.tipo = 'O';
          backendData.nao_agrupar = formData.naoAgrupar;
          // Para ofertas, preservar o culto existente ou deixar null
        } else if (formData.tipoEntrada === 'outro') {
          backendData.tipo = 'O'; // Tratamos "outro" como oferta especial
          backendData.culto = 'OT';
          backendData.nao_agrupar = true; // Sempre não agrupa para "outro"
        }
      } else {
        backendData.tipo = 'S';
        backendData.nao_agrupar = true; // Saídas nunca são agrupadas
        // Para despesas, preservar tipo_despesa existente
      }

      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/transacoes/${transaction.id}/editar/`,
        backendData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      setNotification && setNotification({ 
        message: 'Transação atualizada com sucesso!', 
        type: 'success' 
      });
      onSave && onSave();
      onClose && onClose();
    } catch (error) {
      setNotification && setNotification({ 
        message: 'Erro ao atualizar transação: ' + (error.response?.data?.detail || error.message), 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <div className="transaction-type-selection">
      <h3>Editar Transação</h3>
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
          ← Alterar tipo
        </button>
        <h3>
          Editar {transactionType === 'entrada' ? 'Entrada' : 'Saída'}
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
            {loading ? <span className="spinner" /> : 'Atualizar'}
          </button>
          <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
  
  return (
    <div className="modal-overlay" onClick={e => { if (e.target.classList.contains('modal-overlay')) onClose && onClose(); }}>
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
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .type-btn {
          background: white;
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
          min-width: 140px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .type-btn:hover {
          border-color: var(--primary-color, #3b82f6);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }
        
        .entrada-btn:hover {
          border-color: var(--success-color, #10b981);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
        }
        
        .saida-btn:hover {
          border-color: var(--warning-color, #f59e0b);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
        }
        
        .type-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          color: white;
          background: var(--primary-color, #3b82f6);
        }
        
        .entrada-btn .type-icon {
          background: var(--success-color, #10b981);
        }
        
        .saida-btn .type-icon {
          background: var(--warning-color, #f59e0b);
        }
        
        .type-label {
          font-weight: 600;
          color: var(--neutral-800, #1f2937);
          font-size: 1.1rem;
        }
        
        .type-desc {
          font-size: 0.85rem;
          color: var(--neutral-500, #6b7280);
        }
        
        .transaction-form-content {
          padding: 0;
        }
        
        .form-header {
          display: flex;
          align-items: center;
          padding: 20px 24px 0 24px;
          margin-bottom: 20px;
        }
        
        .back-btn {
          background: none;
          border: none;
          color: var(--primary-color, #3b82f6);
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.9rem;
          transition: background 0.2s;
          margin-right: 16px;
        }
        
        .back-btn:hover {
          background: var(--primary-50, #eff6ff);
        }
        
        .form-header h3 {
          margin: 0;
          color: var(--neutral-800, #1f2937);
          font-size: 1.3rem;
        }
        
        .form-content {
          padding: 0 24px;
          max-height: 60vh;
          overflow-y: auto;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: var(--neutral-700, #374151);
          font-size: 0.9rem;
        }
        
        .required-indicator {
          color: var(--error-color, #ef4444);
        }
        
        .form-input {
          width: 100%;
          padding: 12px;
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        
        .form-input:focus {
          outline: none;
          border-color: var(--primary-color, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .date-input-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .current-date-btn {
          background: var(--neutral-100, #f3f4f6);
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 0.85rem;
          cursor: pointer;
          color: var(--neutral-600, #6b7280);
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .current-date-btn:hover {
          background: var(--neutral-200, #e5e7eb);
          border-color: var(--primary-color, #3b82f6);
        }
        
        .checkbox-group {
          background: var(--neutral-50, #f9fafb);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          padding: 16px;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          margin-bottom: 8px;
        }
        
        .checkbox-input {
          width: 18px;
          height: 18px;
          margin-right: 12px;
          cursor: pointer;
        }
        
        .checkbox-text {
          font-weight: 500;
          color: var(--neutral-700, #374151);
        }
        
        .checkbox-help {
          color: var(--neutral-500, #6b7280);
          font-size: 0.8rem;
          line-height: 1.4;
          margin-left: 30px;
        }
        
        .modal-actions {
          display: flex;
          gap: 12px;
          padding: 20px 24px 24px 24px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          justify-content: flex-end;
        }
        
        .btn-primary {
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: var(--primary-700, #1d4ed8);
        }
        
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .btn-outline {
          background: transparent;
          color: var(--neutral-600, #6b7280);
          border: 2px solid var(--border-color, #e5e7eb);
          border-radius: 8px;
          padding: 10px 24px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-outline:hover:not(:disabled) {
          border-color: var(--neutral-300, #d1d5db);
          background: var(--neutral-50, #f9fafb);
        }
        
        .btn-outline:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

export default EditTransactionModal;