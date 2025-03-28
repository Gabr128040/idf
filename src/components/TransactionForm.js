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
      // Formatar a data para o formato esperado pelo backend (ISO 8601)
      const formattedData = {
        ...formData,
        data: formData.data ? `${formData.data}T00:00:00Z` : '', // Adiciona hora para compatibilidade com DateTimeField
      };
      await axios.post(
        `${process.env.REACT_APP_API_URL}/api/transacoes/nova/`,
        formattedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setNotification({ message: 'Transação adicionada com sucesso!', type: 'success' });
      onTransactionAdded();
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
      setNotification({ message: 'Erro ao adicionar transação: ' + error.message, type: 'error' });
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