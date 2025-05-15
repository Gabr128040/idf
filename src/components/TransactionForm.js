import React, { useState } from 'react';
import axios from 'axios';
import './TransactionForm.css';

// Adapta TransactionForm para aceitar igrejaId e enviar no payload
const TransactionForm = ({ igrejaId, onTransactionAdded, setNotification, onCancel }) => {
  const [formData, setFormData] = useState({
    tipo: 'D',
    quantia: '',
    data: '',
    nome: '',
    culto: '',
    tipo_despesa: '',
    descricao: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const token = localStorage.getItem('token');
        const formattedData = {
            ...formData,
            quantia: parseFloat(formData.quantia) || 0,
            culto: formData.culto || null,
            tipo_despesa: formData.tipo_despesa || null,
            nome: formData.nome || null,
            descricao: formData.descricao || null,
            igreja: igrejaId, // Adiciona igrejaId ao payload
        };
        const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/api/igrejas/${igrejaId}/transacoes/`,
            formattedData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        setNotification && setNotification({ message: 'Transação adicionada com sucesso!', type: 'success' });
        onTransactionAdded && onTransactionAdded(response.data);
        setFormData({
            tipo: 'D',
            quantia: '',
            data: '',
            nome: '',
            culto: '',
            tipo_despesa: '',
            descricao: '',
        });
    } catch (error) {
        setNotification && setNotification({ message: 'Erro ao adicionar transação: ' + (error.response?.data?.detail || error.message), type: 'error' });
    }
  };

  return (
    <div className="transaction-form zz-transaction-form">
      <h2 className="zz-form-title">Adicionar Transação</h2>
      <form onSubmit={handleSubmit}>
        <select name="tipo" value={formData.tipo} onChange={handleChange} className="zz-form-input">
          <option value="D">Dízimo</option>
          <option value="O">Oferta</option>
          <option value="S">Despesa</option>
        </select>
        <input
          type="number"
          name="quantia"
          placeholder="Quantia (R$)"
          value={formData.quantia}
          onChange={handleChange}
          step="0.01"
          required
          className="zz-form-input"
        />
        <input
          type="date"
          name="data"
          value={formData.data}
          onChange={handleChange}
          required
          className="zz-form-input"
        />
        {formData.tipo === 'D' && (
          <input
            type="text"
            name="nome"
            placeholder="Nome do Contribuinte"
            value={formData.nome}
            onChange={handleChange}
            className="zz-form-input"
          />
        )}
        {formData.tipo === 'O' && (
          <select name="culto" value={formData.culto} onChange={handleChange} className="zz-form-input">
            <option value="">Selecione o Culto</option>
            <option value="CV">Culto da Vitória</option>
            <option value="EBD">EBD</option>
            <option value="GR">Gratidão</option>
            <option value="LR">Lar</option>
            <option value="FM">Família</option>
            <option value="DP">Departamento</option>
            <option value="OT">Outro</option>
          </select>
        )}
        {formData.tipo === 'S' && (
          <select name="tipo_despesa" value={formData.tipo_despesa} onChange={handleChange} className="zz-form-input">
            <option value="">Selecione o Tipo de Despesa</option>
            <option value="CT">Conta</option>
            <option value="IN">Insumo</option>
            <option value="OT">Outro</option>
          </select>
        )}
        <textarea
          name="descricao"
          placeholder="Descrição (opcional)"
          value={formData.descricao}
          onChange={handleChange}
          className="zz-form-input"
        />
        <div className="form-actions zz-form-actions">
          <button type="submit" className="zz-btn zz-btn-primary">Adicionar</button>
          {typeof onCancel === 'function' && (
            <button type="button" className="zz-btn zz-btn-secondary" onClick={onCancel}>Cancelar</button>
          )}
        </div>
      </form>
      <style>{`
        .zz-transaction-form { background: none; box-shadow: none; padding: 0; }
        .zz-form-title { color: #4f8cff; font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; text-align: left; }
        .zz-form-input { border-radius: 8px; border: 1.5px solid #4f8cff; padding: 7px 12px; font-size: 1rem; background: #f7fafc; color: #2c3e50; margin-bottom: 8px; width: 100%; transition: border 0.2s; box-shadow: 0 1px 4px #0001; }
        .zz-form-input:focus { border: 1.5px solid #357ae8; outline: none; }
        .zz-form-actions { display: flex; gap: 12px; margin-top: 8px; justify-content: flex-end; }
      `}</style>
    </div>
  );
};

export default TransactionForm;