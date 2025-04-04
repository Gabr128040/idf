import React, { useState } from 'react';
import axios from 'axios';
import './TransactionForm.css';

const TransactionForm = ({ onTransactionAdded, setNotification }) => {
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
        // Não adicionar hora, apenas enviar a data no formato YYYY-MM-DD
        const formattedData = {
            ...formData,
            quantia: parseFloat(formData.quantia) || 0,  // Converter quantia para número
            culto: formData.culto || null,  // Converter strings vazias para null
            tipo_despesa: formData.tipo_despesa || null,
            nome: formData.nome || null,
            descricao: formData.descricao || null,
        };
        console.log("Dados enviados:", formattedData);  // Adicionar log para depuração
        const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/api/transacoes/nova/`,
            formattedData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',  // Adicionar explicitamente
                },
            }
        );
        setNotification({ message: 'Transação adicionada com sucesso!', type: 'success' });
        onTransactionAdded(response.data);  // Passar os dados da transação criada
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
        console.error('Erro ao adicionar transação:', error.response?.data || error.message);
        setNotification({ message: 'Erro ao adicionar transação: ' + (error.response?.data?.detail || error.message), type: 'error' });
    }
};

  return (
    <div className="transaction-form">
      <h2>Adicionar Transação</h2>
      <form onSubmit={handleSubmit}>
        <select name="tipo" value={formData.tipo} onChange={handleChange}>
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
          step="0.01" // Permite valores decimais
          required
        />
        <input
          type="date"
          name="data"
          value={formData.data}
          onChange={handleChange}
          required
        />
        {formData.tipo === 'D' && (
          <input
            type="text"
            name="nome"
            placeholder="Nome do Contribuinte"
            value={formData.nome}
            onChange={handleChange}
          />
        )}
        {formData.tipo === 'O' && (
          <select name="culto" value={formData.culto} onChange={handleChange}>
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
          <select name="tipo_despesa" value={formData.tipo_despesa} onChange={handleChange}>
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
        />
        <button type="submit">Adicionar</button>
      </form>
    </div>
  );
};

export default TransactionForm;