
import React, { useState, useEffect, useRef } from 'react';
import ModalBase from './ModalBase';
import Tooltip from './Tooltip';
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
    <>
      <div className="form-header">
        <h3>Nova Transação</h3>
      </div>
      <p className="modal-subtitle">Escolha o tipo de transação:</p>
      <div className="transaction-type-selection">
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
    </>
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
              <Tooltip text="Preencher com a data de hoje" position="top">
                <button
                  type="button"
                  className="current-date-btn"
                  onClick={handleSetCurrentDate}
                  title="Usar data atual"
                  aria-label="Usar data atual"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style={{ marginRight: 8 }}>
                    <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Hoje</span>
                </button>
              </Tooltip>
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
    <ModalBase isOpen={!!isOpen} onClose={onCancel} contentClassName="transaction-form modalbase-small">
      <div ref={modalRef} className="transaction-form-content">
        {step === 1 ? renderStepOne() : renderStepTwo()}
        {step === 1 ? (
          <div className="modal-actions modalbase-center">
            <button type="button" className="btn-outline" onClick={onCancel}>Cancelar</button>
          </div>
        ) : null}
      </div>
    </ModalBase>
  );
};

export default TransactionForm;
