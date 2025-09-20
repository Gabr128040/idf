import React, { useState } from 'react';
import axios from 'axios';
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate } from '../utils';
import { motion } from 'framer-motion';
import './TransactionList.css';
import ConfirmationModal from './ConfirmationModal';

// Remover busca interna e filtros locais, usar props do Dashboard
const TransactionList = ({ transactions, onEdit, onDelete, onTransactionClick, setNotification }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const handleDelete = (id) => {
    setTransactionToDelete(id);
    setIsModalOpen(true);
  };

  // Função para obter o título conforme as novas regras
  const getTituloTransacao = (transaction) => {
    // Para despesas (S): usar discriminação como título
    if (transaction.tipo === 'S') {
      // Tentar discriminação primeiro (independente de ser manual ou não)
      if (transaction.discriminacao && transaction.discriminacao.trim()) {
        return transaction.discriminacao;
      }
      // Fallback: descrição
      if (transaction.descricao && transaction.descricao.trim()) {
        return transaction.descricao;
      }
      // Se não tem discriminação, usar o tipo de despesa
      return getTipoDespesaDisplay(transaction.tipo_despesa);
    }
    
    // Para dízimos/ofertas (D/O): usar discriminação se tiver, senão apenas o tipo
    if (transaction.tipo === 'D' || transaction.tipo === 'O') {
      // Verificar se tem discriminação (independente de ser manual ou não)
      if (transaction.discriminacao && transaction.discriminacao.trim()) {
        return transaction.discriminacao;
      }
      // Se não tem discriminação, retornar apenas o tipo
      return getTipoDisplay(transaction.tipo);
    }
    
    // Fallback para outros tipos
    return getTipoDisplay(transaction.tipo);
  };

  const getCampoEspecifico = (transaction) => {
    if (transaction.manual && transaction.discriminacao) {
      return transaction.discriminacao;
    }
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

  // Paginação local
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;
  const totalPages = Math.ceil(transactions.length / transactionsPerPage);
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = transactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

  return (
    <div className="transaction-list zz-transaction-list">
      {/* Removido o título <h2>Transações</h2> para evitar duplicidade */}
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
        style={{ marginBottom: 24 }}
      >
        {currentTransactions.map((transaction) => (
          <motion.li
            key={transaction.id}
            onClick={() => onEdit && onEdit(transaction)}
            className={transaction.tipo === 'S' ? 'despesa' : ''}
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.3 }}
            // ...sem touch para deletar, só clique no botão
          >
            <span>{getTituloTransacao(transaction)}</span>
            <span>R$ {transaction.quantia}</span>
            <span>{getCampoEspecifico(transaction)}</span>
            <span>{formatDate(transaction.data)}</span>
            <button
              className="zz-trans-delete-btn"
              title="Excluir transação"
              onClick={e => { e.stopPropagation(); handleDelete(transaction.id); }}
              style={{ marginLeft: 8, background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: 16 }}
            >
              &#128465;
            </button>
          </motion.li>
        ))}
      </motion.ul>
      {/* Paginação */}
      {totalPages > 1 && (
        <div className="zz-pagination">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>&lt;</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={currentPage === i + 1 ? 'active' : ''}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>&gt;</button>
        </div>
      )}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmDelete}
        message="Tem certeza que deseja excluir esta transação?"
      />
      <style>{`
        .zz-transaction-list { background: none; box-shadow: none; border-radius: 0; }
        .zz-pagination { display: flex; gap: 6px; justify-content: center; margin-bottom: 10px; }
        .zz-pagination button { background: #f7fafc; border: 1px solid #4f8cff; color: #4f8cff; border-radius: 6px; padding: 4px 10px; font-weight: 600; cursor: pointer; transition: background 0.18s; }
        .zz-pagination button.active, .zz-pagination button:hover { background: #4f8cff; color: #fff; }
        .zz-pagination button:disabled { background: #e3e9f7; color: #aaa; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default TransactionList;