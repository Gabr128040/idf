import React, { useState } from 'react';
import axios from 'axios';
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate } from '../utils';
import './TransactionList.css';
import ConfirmationModal from './ConfirmationModal';

const TransactionList = ({ transactions, onEdit, onDelete, onTransactionClick, setTransactions}) => {
  
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Mês atual
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [error, setError] = useState(null);

  // Função para abrir o modal de confirmação
  const handleDelete = (id) => {
    setTransactionToDelete(id);
    setIsModalOpen(true);
  };
  
  const fetchFilteredData = async (month, year) => {
  const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/transacoes/?mes=${month}&ano=${year}`);
  setTransactions(response.data);
};
  
  
  const getCampoEspecifico = (transaction) => {
    switch (transaction.tipo) {
      case 'D':
        return transaction.nome;
      case 'O':
        return getCultoDisplay(transaction.culto);
      case 'S':
        return getTipoDespesaDisplay(transaction.tipo_despesa);
      default:
        return '-';
    }
  };
  

  // Função para confirmar a exclusão
  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/transacoes/${transactionToDelete}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert('Transação excluída com sucesso!');
      onDelete(transactionToDelete); // Notifica o componente pai para atualizar a lista
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
    } finally {
      setIsModalOpen(false); // Fecha o modal
    }
  };

  // Função para transformar o tipo (D, O, S) em uma string legível
  const getTipoDisplay = (tipo) => {
    switch (tipo) {
      case 'D':
        return 'Dízimo';
      case 'O':
        return 'Oferta';
      case 'S':
        return 'Despesa';
      default:
        return 'Desconhecido';
    }
  };

  // Exibe uma mensagem de erro se houver
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  // Exibe uma mensagem se não houver transações
  if (!transactions || transactions.length === 0) {
    return <div className="no-transactions">Nenhuma transação encontrada.</div>;
  }

  return (
    
    <div className="transaction-list">
      
      <h2>Transações</h2>
      <ul>
        {transactions.map((transaction) => (
          <li
            key={transaction.id} onClick={() => onTransactionClick(transaction)}
            className={transaction.tipo === 'S' ? 'despesa' : ''}>
            <span>{getTipoDisplay(transaction.tipo)}</span>
            <span>R$ {transaction.quantia}</span>
            <span>{getCampoEspecifico(transaction)}</span>
            <span>{formatDate(transaction.data)}</span> {/* Data formatada */}
          </li>
        ))}
      </ul>

      {/* Modal de confirmação para deletar transação */}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDelete}
        message="Tem certeza que deseja excluir esta transação?"
      />
    </div>
  );
};

export default TransactionList;



