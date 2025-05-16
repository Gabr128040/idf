import React, { useState } from 'react';
import axios from 'axios';
import './EditTransactionModal.css';

const EditTransactionModal = ({ transaction, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    tipo: transaction.tipo,
    quantia: transaction.quantia,
    data: transaction.data,
    descricao: transaction.descricao,
    nome: transaction.nome || '',
    culto: transaction.culto || '',
    tipo_despesa: transaction.tipo_despesa || '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Função para atualizar os campos do formulário
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Função para enviar o formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/transacoes/${transaction.id}/editar/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      onSave && onSave();
      onClose && onClose();
    } catch (error) {
      setError('Erro ao editar transação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="edit-transaction-modal">
        <h3>Editar Transação</h3>
        <form onSubmit={handleSubmit}>
          {/* Campo para selecionar o tipo de transação */}
          <select name="tipo" value={formData.tipo} onChange={handleChange} required>
            <option value="D">Dízimo</option>
            <option value="O">Oferta</option>
            <option value="S">Despesa</option>
          </select>

          {/* Campo para a quantia */}
          <input
            type="number"
            name="quantia"
            placeholder="Quantia"
            value={formData.quantia}
            onChange={handleChange}
            required
          />

          {/* Campo para a data */}
          <input
            type="date"
            name="data"
            value={formData.data}
            onChange={handleChange}
            required
          />

          {/* Campo para a descrição */}
          <textarea
            name="descricao"
            placeholder="Descrição"
            value={formData.descricao}
            onChange={handleChange}
            required
          />

          {/* Campo para o nome do contribuinte (apenas para dízimos) */}
          {formData.tipo === 'D' && (
            <input
              type="text"
              name="nome"
              placeholder="Nome do Contribuinte"
              value={formData.nome}
              onChange={handleChange}
              required
            />
          )}

          {/* Campo para o culto (apenas para ofertas) */}
          {formData.tipo === 'O' && (
            <select name="culto" value={formData.culto} onChange={handleChange} required>
              <option value="">Selecione o culto</option>
              <option value="CV">Culto da Vitória</option>
              <option value="EBD">EBD</option>
              <option value="GR">Gratidão</option>
              <option value="LR">Lar</option>
              <option value="FM">Família</option>
              <option value="DP">Departamento</option>
              <option value="OT">Outro</option>
            </select>
          )}

          {/* Campo para o tipo de despesa (apenas para despesas) */}
          {formData.tipo === 'S' && (
            <select name="tipo_despesa" value={formData.tipo_despesa} onChange={handleChange} required>
              <option value="">Selecione o tipo de despesa</option>
              <option value="CT">Conta</option>
              <option value="IN">Insumo</option>
              <option value="OT">Outro</option>
            </select>
          )}

          {/* Botões do modal */}
          <div className="modal-buttons">
            <button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" onClick={onClose} disabled={loading}>Cancelar</button>
          </div>
        </form>

        {/* Exibe mensagens de erro */}
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export default EditTransactionModal;