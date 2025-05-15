import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate } from '../utils';
import { motion } from 'framer-motion';
import './TransactionList.css';
import ConfirmationModal from './ConfirmationModal';

const TransactionList = ({ igrejaId, onEdit, onDelete, onTransactionClick, setNotification }) => {
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!igrejaId) return;
    // Busca transações filtradas por igreja
    axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/${igrejaId}/transacoes/?mes=${selectedMonth}&ano=${selectedYear}`)
      .then(res => setTransactions(res.data))
      .catch(() => setError('Erro ao carregar transações.'));
  }, [igrejaId, selectedMonth, selectedYear]);

  const handleDelete = (id) => {
    setTransactionToDelete(id);
    setIsModalOpen(true);
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
    <div className="transaction-list zz-transaction-list">
      <h2 className="zz-trans-title">Transações</h2>
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
            onClick={() => onTransactionClick && onTransactionClick(transaction)}
            className={transaction.tipo === 'S' ? 'despesa zz-trans-despesa' : 'zz-trans-receita'}
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.3 }}
          >
            <span className="zz-trans-tipo">{getTipoDisplay(transaction.tipo)}</span>
            <span className="zz-trans-valor">R$ {transaction.quantia}</span>
            <span className="zz-trans-desc">{getCampoEspecifico(transaction)}</span>
            <span className="zz-trans-data">{formatDate(transaction.data)}</span>
          </motion.li>
        ))}
      </motion.ul>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDelete}
        message="Tem certeza que deseja excluir esta transação?"
      />
      <style>{`
        .zz-transaction-list { padding: 0 0 18px 0; }
        .zz-trans-title { font-size: 1.1rem; color: #4f8cff; font-weight: 600; margin-bottom: 8px; }
        .zz-transaction-list ul { list-style: none; padding: 0; margin: 0; }
        .zz-transaction-list li { display: flex; justify-content: space-between; align-items: center; background: #f7fafc; border-radius: 8px; margin-bottom: 8px; padding: 10px 14px; box-shadow: 0 1px 4px #0001; transition: box-shadow 0.2s, background 0.2s; cursor: pointer; }
        .zz-transaction-list li:hover { background: #e3e9f7; box-shadow: 0 2px 8px #4f8cff22; }
        .zz-trans-tipo { font-weight: 600; color: #4f8cff; min-width: 70px; }
        .zz-trans-valor { font-weight: 700; color: #2ecc71; min-width: 90px; text-align: right; }
        .zz-trans-despesa .zz-trans-valor { color: #e74c3c; }
        .zz-trans-desc { color: #555; flex: 1; margin: 0 10px; min-width: 80px; }
        .zz-trans-data { color: #888; font-size: 0.95em; min-width: 80px; text-align: right; }
        @media (max-width: 600px) {
          .zz-transaction-list li { flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 8px; }
          .zz-trans-tipo, .zz-trans-valor, .zz-trans-desc, .zz-trans-data { min-width: 0; text-align: left; }
        }
      `}</style>
    </div>
  );
};

export default TransactionList;