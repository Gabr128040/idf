import React, { useState } from 'react';
import axios from 'axios';
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate } from '../utils';
import { motion } from 'framer-motion';
import './TransactionList.css';
import ConfirmationModal from './ConfirmationModal';

const TransactionList = ({ transactions, onEdit, onDelete, onTransactionClick, setTransactions, setNotification }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [error, setError] = useState(null);

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
      setNotification({ message: 'Transação excluída com sucesso!', type: 'success' });
      onDelete(transactionToDelete);
    } catch (error) {
      setNotification({ message: 'Erro ao excluir transação: ' + error.message, type: 'error' });
    } finally {
      setIsModalOpen(false);
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!transactions || transactions.length === 0) {
    return <div className="no-transactions">Nenhuma transação encontrada.</div>;
  }

  return (
    <div className="transaction-list">
      <h2>Transações</h2>
      <motion.ul
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        {transactions.map((transaction) => (
          <motion.li
            key={transaction.id}
            onClick={() => onTransactionClick(transaction)}
            className={transaction.tipo === 'S' ? 'despesa' : ''}
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.3 }}
          >
            <span>{getTipoDisplay(transaction.tipo)}</span>
            <span>R$ {transaction.quantia}</span>
            <span>{getCampoEspecifico(transaction)}</span>
            <span>{formatDate(transaction.data)}</span>
          </motion.li>
        ))}
      </motion.ul>

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