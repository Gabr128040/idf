import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTransactions, fetchSaldo, deleteTransaction, setupAxiosInterceptors } from '../api/transactions';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import EditTransactionModal from '../components/EditTransactionModal';
import SaldoIndicator from '../components/SaldoIndicator';
import ConfirmationModal from '../components/ConfirmationModal';
import './Dashboard.css';
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate } from '../utils';

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(''); // Vazio para "Todos"
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const navigate = useNavigate();

  // Configura os interceptors do axios
  useEffect(() => {
    setupAxiosInterceptors(navigate);
  }, [navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transData, saldoData] = await Promise.all([
        fetchTransactions(selectedMonth || null, selectedYear, navigate),
        fetchSaldo(navigate),
      ]);
      setTransactions(transData);
      setSaldo(saldoData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const handleTransactionAdded = () => {
    console.log('[DEBUG] Nova transação adicionada');
    fetchData();
  };

  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteTransaction(transactionToDelete.id, navigate);
      setSelectedTransaction(null);
      fetchData();
      setIsModalOpen(false);
      setTransactionToDelete(null);
    } catch (err) {
      setError(err.message);
      setIsModalOpen(false);
    }
  };

  const handleEdit = (transaction) => {
    console.log(`[DEBUG] Editando transação ID: ${transaction.id}`);
    setSelectedTransaction(null);
    setEditingTransaction(transaction);
  };

  const handleSave = () => {
    console.log('[DEBUG] Transação editada salva');
    fetchData();
    setEditingTransaction(null);
  };

  return (
    <div className="dashboard">
      {isLoading && <div className="loading">Carregando...</div>}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={fetchData}>Tentar novamente</button>
        </div>
      )}
      {!isLoading && !error && (
        <>
          <SaldoIndicator saldo={saldo} />
          <button className="dashboard-button" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Fechar Formulário' : 'Criar/Editar/Deletar Registro'}
          </button>
          {showForm && <TransactionForm onTransactionAdded={handleTransactionAdded} />}
          <div className="month-filter">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Todos os Meses</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              min="2020"
              max={new Date().getFullYear()}
            />
          </div>
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTransactionClick={setSelectedTransaction}
            setTransactions={setTransactions}
          />
          {editingTransaction && (
            <EditTransactionModal
              transaction={editingTransaction}
              onClose={() => setEditingTransaction(null)}
              onSave={handleSave}
            />
          )}
          {selectedTransaction && (
            <div
              className="modal-overlay"
              onClick={(e) => e.target === e.currentTarget && setSelectedTransaction(null)}
            >
              <div className="modal-content">
                <h3>Detalhes da Transação</h3>
                <p><strong>Tipo:</strong> {getTipoDisplay(selectedTransaction.tipo)}</p>
                <p><strong>Valor:</strong> R$ {selectedTransaction.quantia}</p>
                <p><strong>Data:</strong> {formatDate(selectedTransaction.data)}</p>
                {selectedTransaction.tipo === 'D' && (
                  <p><strong>Contribuinte:</strong> {selectedTransaction.nome}</p>
                )}
                {selectedTransaction.tipo === 'O' && (
                  <p><strong>Culto:</strong> {getCultoDisplay(selectedTransaction.culto)}</p>
                )}
                {selectedTransaction.tipo === 'S' && (
                  <p><strong>Tipo de Despesa:</strong> {getTipoDespesaDisplay(selectedTransaction.tipo_despesa)}</p>
                )}
                <p><strong>Descrição:</strong> {selectedTransaction.descricao}</p>
                <button onClick={() => handleEdit(selectedTransaction)}>Editar</button>
                <button onClick={() => handleDelete(selectedTransaction)}>Excluir</button>
                <button onClick={() => setSelectedTransaction(null)}>Fechar</button>
              </div>
            </div>
          )}
          <ConfirmationModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onConfirm={confirmDelete}
            message="Tem certeza que deseja excluir esta transação?"
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;