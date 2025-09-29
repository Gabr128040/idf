import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import ModalBase from './ModalBase';
import Tooltip from './Tooltip';
import './TransactionForm.css';

const EditTransactionModal = ({ transaction, onClose, onSave, setNotification }) => {

  const mapTransactionToFormData = (transaction) => {
    let tipoEntrada = '';
    if (!transaction) return {
      valor: '', data: '', discriminacao: '', tipoEntrada: '', naoAgrupar: false, nome: '', culto: '', tipo_despesa: ''
    };

    if (transaction.tipo === 'D') {
      tipoEntrada = 'dizimo';
    } else if (transaction.tipo === 'O') {
      tipoEntrada = transaction.culto === 'OT' ? 'outro' : 'oferta';
    }

    return {
      valor: transaction.quantia || '',
      data: transaction.data || '',
      discriminacao: transaction.descricao || transaction.discriminacao || '',
      tipoEntrada,
      naoAgrupar: transaction.nao_agrupar || false,
      nome: transaction.nome || '',
      culto: transaction.culto || '',
      tipo_despesa: transaction.tipo_despesa || '',
    };
  };

  const [step, setStep] = useState(2);
  const [transactionType, setTransactionType] = useState(
    transaction && transaction.tipo === 'S' ? 'saida' : 'entrada'
  );
  const [formData, setFormData] = useState(mapTransactionToFormData(transaction || {}));
  const [loading, setLoading] = useState(false);

  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSetCurrentDate = () => setFormData({ ...formData, data: getCurrentDate() });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleTypeSelection = (type) => {
    setTransactionType(type);
    setStep(2);
    setFormData({ valor: '', data: '', discriminacao: '', tipoEntrada: type === 'entrada' ? 'dizimo' : '', naoAgrupar: false });
  };

  const handleBack = () => setStep(1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (transactionType === 'entrada' && formData.tipoEntrada === 'outro' && !formData.discriminacao.trim()) {
      setNotification && setNotification({ message: 'Discriminação é obrigatória para transações do tipo "Outro"', type: 'error' });
      return;
    }

    if (transactionType === 'saida' && !formData.discriminacao.trim()) {
      setNotification && setNotification({ message: 'Discriminação é obrigatória para saídas', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const backendData = {
        quantia: parseFloat(formData.valor) || 0,
        data: formData.data,
        descricao: formData.discriminacao || null,
        nome: formData.nome || null,
        culto: formData.culto || null,
        tipo_despesa: formData.tipo_despesa || null,
      };

      if (transactionType === 'entrada') {
        if (formData.tipoEntrada === 'dizimo') {
          backendData.tipo = 'D';
          backendData.nao_agrupar = formData.naoAgrupar;
        } else if (formData.tipoEntrada === 'oferta') {
          backendData.tipo = 'O';
          backendData.nao_agrupar = formData.naoAgrupar;
        } else if (formData.tipoEntrada === 'outro') {
          backendData.tipo = 'O';
          backendData.culto = 'OT';
          backendData.nao_agrupar = true;
        }
      } else {
        backendData.tipo = 'S';
        backendData.nao_agrupar = true;
      }

      await axios.put(
        `${process.env.REACT_APP_API_URL}/api/transacoes/${transaction.id}/editar/`,
        backendData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      setNotification && setNotification({ message: 'Transação atualizada com sucesso!', type: 'success' });
      onSave && onSave();
      onClose && onClose();
    } catch (error) {
      setNotification && setNotification({ message: 'Erro ao atualizar transação: ' + (error.response?.data?.detail || error.message), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <div className="transaction-type-selection">
      <h3>Editar Transação</h3>
      <p>Escolha o tipo de transação:</p>
      <div className="type-buttons">
        <button type="button" className="type-btn entrada-btn" onClick={() => handleTypeSelection('entrada')}>
          <div className="type-icon">+</div>
          <div className="type-label">Entrada</div>
          <div className="type-desc">Dízimos, Ofertas, Outros</div>
        </button>
        <button type="button" className="type-btn saida-btn" onClick={() => handleTypeSelection('saida')}>
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
        <button type="button" className="back-btn" onClick={handleBack}>← Alterar tipo</button>
        <h3>Editar {transactionType === 'entrada' ? 'Entrada' : 'Saída'}</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-content">
          <div className="form-group">
            <label>Valor (R$)</label>
            <input type="number" name="valor" placeholder="0,00" value={formData.valor} onChange={handleChange} step="0.01" required className="form-input" />
          </div>

          <div className="form-group">
            <label>Data</label>
            <div className="date-input-group">
              <input type="date" name="data" value={formData.data} onChange={handleChange} required className="form-input" />
              <Tooltip text="Preencher com a data de hoje" position="top">
                <button type="button" className="current-date-btn" onClick={handleSetCurrentDate} title="Usar data atual" aria-label="Usar data atual">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style={{ marginRight: 8 }}>
                    <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Hoje</span>
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="form-group">
            <label>
              Discriminação
              {((transactionType === 'entrada' && formData.tipoEntrada === 'outro') || transactionType === 'saida') && (
                <span className="required-indicator"> *</span>
              )}
            </label>
            <input type="text" name="discriminacao" placeholder="Descrição da transação" value={formData.discriminacao} onChange={handleChange} className="form-input" required={(transactionType === 'entrada' && formData.tipoEntrada === 'outro') || transactionType === 'saida'} />
          </div>

          {transactionType === 'entrada' && (
            <div className="form-group">
              <label>Tipo</label>
              <select name="tipoEntrada" value={formData.tipoEntrada} onChange={handleChange} className="form-input" required>
                <option value="dizimo">Dízimo</option>
                <option value="oferta">Oferta</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          )}

          {transactionType === 'entrada' && (formData.tipoEntrada === 'dizimo' || formData.tipoEntrada === 'oferta') && (
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" name="naoAgrupar" checked={formData.naoAgrupar} onChange={handleChange} className="checkbox-input" />
                <span className="checkbox-text">Não agrupar no PDF</span>
              </label>
              <small className="checkbox-help">Por padrão, {formData.tipoEntrada === 'dizimo' ? 'dízimos' : 'ofertas'} do mesmo dia são agrupados no PDF</small>
            </div>
          )}

        </div>

        <div className="modal-actions">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? <span className="spinner" /> : 'Atualizar'}</button>
          <button type="button" className="btn-outline" onClick={onClose} disabled={loading}>Cancelar</button>
        </div>
      </form>
    </div>
  );

  return (
    <ModalBase isOpen={true} onClose={onClose} contentClassName="transaction-form modalbase-small">
      <div className="modal-inner">
        {step === 1 ? renderStepOne() : renderStepTwo()}
      </div>
    </ModalBase>
  );
};

export default EditTransactionModal;