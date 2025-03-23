import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import EditTransactionModal from '../components/EditTransactionModal';
import SaldoIndicator from '../components/SaldoIndicator';
import './Dashboard.css';
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate } from '../utils';

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // Mês atual
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // Ano atual
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [saldo, setSaldo] = useState(0); // Estado para armazenar o saldo
  const [error, setError] = useState(null); // Estado para armazenar erros
  const [isEditing, setIsEditing] = useState(false); // Controla se o modal de edição está aberto
  const navigate = useNavigate();

  // Função para buscar transações filtradas por mês/ano
const fetchFilteredData = async (month, year) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login'); // Redireciona para o login se não houver token
      return;
    }

    const response = await axios.get(
      `https://idf-ip90.onrender.com/api/transacoes/?mes=${month}&ano=${year}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (response.data.error) {
      setError(response.data.error); // Exibe o erro retornado pelo backend
    } else {
      setTransactions(response.data); // Atualiza a lista de transações
    }
  } catch (error) {
    console.error('Erro ao buscar transações:', error);

    if (error.response) {
      // Erro retornado pelo backend
      setError(error.response.data.error || "Erro ao carregar transações. Tente novamente.");
    } else if (error.request) {
      // Erro de conexão (não houve resposta do servidor)
      setError("Não foi possível conectar ao servidor. Verifique sua conexão com a internet.");
    } else {
      // Erro inesperado
      setError("Ocorreu um erro inesperado. Tente novamente mais tarde.");
    }
  }
};

  // Função para buscar o saldo
  const fetchSaldo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login'); // Redireciona para o login se não houver token
        return;
      }

      const response = await axios.get(
        'https://idf-ip90.onrender.com/api/saldo/',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSaldo(response.data.saldo); // Atualiza o saldo
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      setError('Erro ao carregar saldo. Tente novamente.');
    }
  };

  // Função para recarregar todos os dados (transações e saldo)
  const fetchData = async () => {
    await fetchFilteredData(selectedMonth, selectedYear);
    await fetchSaldo();
  };

  // Carrega os dados ao montar o componente ou quando o mês/ano muda
  useEffect(() => {
    fetchFilteredData(selectedMonth,selectedYear);
    fetchData();
  }, [selectedMonth, selectedYear]);

  // Função para lidar com a adição de uma nova transação
  const handleTransactionAdded = () => {
    fetchData(); // Recarrega as transações e o saldo após adicionar uma nova
  };

  // Função para deletar uma transação
  const handleDelete = async (transaction) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://idf-ip90.onrender.com/api/transacoes/${transaction.id}/deletar/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      alert('Transacao deletada com sucesso!');
      setSelectedTransaction(null);
      fetchData(); // Recarrega as transações e o saldo após deletar
    } catch (error) {
      console.error('Erro ao deletar transação:', error);
      setError('Erro ao deletar transação. Tente novamente.');
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedTransaction(null); // Fecha o modal ao clicar fora
    }
  };

  // Função para editar uma transação
  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
  };

  // Função para salvar uma transação editada
  const handleSave = () => {
    fetchData(); // Recarrega as transações e o saldo após editar
    setEditingTransaction(null); // Fecha o modal de edição
  };

  if (error) {
    return <div className="error-message">{error}</div>; // Exibe a mensagem de erro
  }

  return (
    <div className="dashboard">
       {error && <div className="error-message">{error}</div>} {/* Exibe a mensagem de erro */}
      <SaldoIndicator saldo={saldo} /> {/* Passa o saldo como prop */}
      <button className="dashboard-button" onClick={() => setShowForm(!showForm)}>
        Criar/Editar/Deletar Registro
      </button>
      {showForm && (
        <TransactionForm
          onTransactionAdded={handleTransactionAdded} // Passa a função como prop
        />
      )}

      <div className="month-filter">
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>

        <input 
          type="number" 
          value={selectedYear} 
          onChange={(e) => setSelectedYear(e.target.value)} 
          min="2020" 
          max={new Date().getFullYear()}
        />
      </div>

      <TransactionList
        transactions={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTransactionClick={setSelectedTransaction}
      />
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSave}
        />
      )}

      {selectedTransaction && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div className="modal-content">
            <h3>Detalhes da Transação</h3>

            {/* Campos da transação */}
            <p><strong>Tipo:</strong> {getTipoDisplay(selectedTransaction.tipo)}</p>
            <p><strong>Valor:</strong> R$ {selectedTransaction.quantia}</p>
            <p><strong>Data:</strong> {formatDate(selectedTransaction.data)}</p>

            {/* Campo específico por tipo */}
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

            {/* Botões */}
            <button onClick={() => {
              setSelectedTransaction(null); // Fecha o modal de informações
              handleEdit(selectedTransaction); // Abre o formulário de edição
            }}>Editar</button>
            <button onClick={() => {
              handleDelete(selectedTransaction);
            }} >Excluir</button>
            <button onClick={() => setSelectedTransaction(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


