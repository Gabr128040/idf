import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTransactions, fetchSaldo, deleteTransaction, setupAxiosInterceptors } from '../api/transactions';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import EditTransactionModal from '../components/EditTransactionModal';
import SaldoIndicator from '../components/SaldoIndicator';
import ConfirmationModal from '../components/ConfirmationModal';
import Notification from '../components/Notification';
import Navbar from '../components/Navbar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'framer-motion';
import axiosLocal from 'axios';
import logo from '../assets/logo.png';
import './Dashboard.css';
import { getTipoDisplay, getCultoDisplay, getTipoDespesaDisplay, formatDate } from '../utils';
import { FaCalendarAlt, FaSearch } from 'react-icons/fa';

const Dashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [saldo, setSaldo] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [includeGratificacao, setIncludeGratificacao] = useState(true);
  const [includeDizimoGratificacao, setIncludeDizimoGratificacao] = useState(true);
  const [includeDizimoIgreja, setIncludeDizimoIgreja] = useState(true);
  const [reportTransactions, setReportTransactions] = useState([]);

  const [searchDay, setSearchDay] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [searchType, setSearchType] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  const navigate = useNavigate();

  const [isGratificacaoEnabled, setIsGratificacaoEnabled] = useState(true);
  const [showPdfOptions, setShowPdfOptions] = useState(false); // Estado para exibir o menu de PDF
  const [pdfMonth, setPdfMonth] = useState(''); // Mês para o PDF
  const [pdfYear, setPdfYear] = useState(new Date().getFullYear()); // Ano para o PDF
  const [updateSystem, setUpdateSystem] = useState(false); // Controla se o sistema oficial será atualizado


  useEffect(() => {
    setupAxiosInterceptors(navigate);
  }, [navigate]);

  const updateTransactions = async () => {
    try {
      const transData = await fetchTransactions(selectedMonth || null, selectedYear, navigate);
      setTransactions(transData);
      setFilteredTransactions(transData);
      setCurrentPage(1);
    } catch (err) {
      setNotification({ message: 'Erro ao atualizar transações: ' + err.message, type: 'error' });
    }
  };

  const updateSaldo = async () => {
    try {
      const saldoData = await fetchSaldo(navigate);
      setSaldo(saldoData);
    } catch (err) {
      setNotification({ message: 'Erro ao atualizar saldo: ' + err.message, type: 'error' });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transData, saldoData] = await Promise.all([
        fetchTransactions(selectedMonth || null, selectedYear, navigate),
        fetchSaldo(navigate),
      ]);
      setTransactions(transData);
      setFilteredTransactions(transData);
      setSaldo(saldoData);
      setCurrentPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    let filtered = transactions;

    if (searchDay) {
      filtered = filtered.filter((transaction) => {
        const day = transaction.data.split('-')[2]; // Extrai o dia diretamente da string "YYYY-MM-DD"
        return day === searchDay.padStart(2, '0'); // Compara como strings no formato "DD"
      });
    }

    if (searchDescription) {
      filtered = filtered.filter((transaction) =>
        (transaction.descricao || '').toLowerCase().includes(searchDescription.toLowerCase())
      );
    }

    if (searchType) {
      filtered = filtered.filter((transaction) => transaction.tipo === searchType);
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [searchDay, searchDescription, searchType, transactions]);

  const handleTransactionAdded = () => {
    updateTransactions();
    updateSaldo();
  };

  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setIsModalOpen(true);
  };

  const handleGratificacaoChange = (checked) => {
    setIncludeGratificacao(checked);
    if (!checked) {
      setIncludeDizimoGratificacao(false); // Desmarcar o checkbox de dízimo da gratificação
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteTransaction(transactionToDelete.id, navigate);
      setNotification({ message: 'Transação excluída com sucesso!', type: 'success' });
      setSelectedTransaction(null);
      updateTransactions();
      updateSaldo();
      setIsModalOpen(false);
      setTransactionToDelete(null);
    } catch (err) {
      setNotification({ message: 'Erro ao excluir transação: ' + err.message, type: 'error' });
      setIsModalOpen(false);
    }
  };

  const handleEdit = (transaction) => {
    setSelectedTransaction(null);
    setEditingTransaction(transaction);
  };

  const handleSave = () => {
    setNotification({ message: 'Transação editada com sucesso!', type: 'success' });
    updateTransactions();
    updateSaldo();
    setEditingTransaction(null);
  };

  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const truncateToTwoDecimals = (value) => {
    return Math.trunc(value * 100) / 100;
  };

  const getLastDayOfMonth = (year, month) => {
    return new Date(year, month, 0).toISOString().split('T')[0]; // Retorna no formato "YYYY-MM-DD"
  };

  const generateMonthlyReport = async () => {
    if (!pdfMonth) {
      setNotification({ message: 'Por favor, selecione um mês para gerar o relatório.', type: 'error' });
      return;
    }

    setShowReportOptions(false);
    setIsLoading(true);
    setError(null);

    try {
      const transactions = [...reportTransactions]; // Usar as transações filtradas

      // Verificar e corrigir o formato da data, se necessário
      transactions.forEach((transaction) => {
        if (!transaction.data || isNaN(new Date(transaction.data).getTime())) {
          console.error(`Data inválida encontrada: ${transaction.data}`);
        }
      });

      // Ordenar as transações por data em ordem crescente
      transactions.sort((a, b) => {
        const dateA = new Date(a.data);
        const dateB = new Date(b.data);
        return dateA - dateB;
      });

      console.log('Depois da ordenação:', transactions.map((t) => t.data));

      const formattedData = [];

      // Calcular saldo anterior (usado apenas para cálculos, não exibido na tabela)
      const previousMonth = pdfMonth === 1 ? 12 : pdfMonth - 1;
      const previousYear = pdfMonth === 1 ? selectedYear - 1 : selectedYear;
      const axios = axiosLocal.create({
        baseURL: process.env.REACT_APP_API_URL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const previousResponse = await axios.get(`/api/transacoes/?ano=${previousYear}&mes=${previousMonth}`);
      const previousTransactions = previousResponse.data;

      const previousEntradas = previousTransactions
        .filter((t) => t.tipo === 'D' || t.tipo === 'O')
        .reduce((sum, t) => sum + parseFloat(t.quantia), 0);
      const previousSaidas = previousTransactions
        .filter((t) => t.tipo === 'S')
        .reduce((sum, t) => sum + parseFloat(t.quantia), 0);
      const saldoAnterior = previousEntradas - previousSaidas;

      // Adicionar transações extras ao PDF (sempre)
      let gratificacao = 900;
      let dizimoGratificacao = 90;
      let dizimoIgreja = 0;

      // Calcular o total de entradas incluindo o dízimo da gratificação
      const totalEntradasOriginais = transactions
        .filter((t) => t.tipo === 'D' || t.tipo === 'O')
        .reduce((sum, t) => sum + parseFloat(t.quantia), 0);


      let totalEntradasComGratificacao = totalEntradasOriginais;
      if (includeDizimoGratificacao) {
        totalEntradasComGratificacao += dizimoGratificacao;
      }

      // Calcular o dízimo da igreja com base no total de entradas atualizado (apenas se marcado)
      if (includeDizimoIgreja) {
        dizimoIgreja = truncateToTwoDecimals(totalEntradasComGratificacao * 0.1);
      }

      // Calcular o total de saídas incluindo as transações extras (apenas se marcadas)
      let totalSaidas = transactions
        .filter((t) => t.tipo === 'S')
        .reduce((sum, t) => sum + parseFloat(t.quantia), 0);

      if (includeGratificacao) {
        totalSaidas += gratificacao;
      }

      if (includeDizimoIgreja) {
        totalSaidas += dizimoIgreja;
      }


      // Calcular a data do último dia do mês
      const lastDayOfMonth = getLastDayOfMonth(pdfYear, pdfMonth);

      // Criar oficialmente no site apenas se os checkboxes estiverem ativados
      if (updateSystem) {
        if (includeGratificacao) {
          const gratificacaoTransacao = {
            tipo: 'S',
            tipo_despesa: 'OT',
            descricao: 'Gratificação do Líder',
            quantia: gratificacao,
            data: lastDayOfMonth, // Usar o último dia do mês
          };
          await axios.post('/api/transacoes/nova/', gratificacaoTransacao);
          transactions.push(gratificacaoTransacao); // Adicionar ao array de transações
        }

        if (includeDizimoGratificacao) {
          const dizimoGratificacaoTransacao = {
            tipo: 'D',
            descricao: 'Dízimo da Gratificação',
            quantia: dizimoGratificacao,
            data: lastDayOfMonth, // Usar o último dia do mês
          };
          await axios.post('/api/transacoes/nova/', dizimoGratificacaoTransacao);
          transactions.push(dizimoGratificacaoTransacao); // Adicionar ao array de transações
        }

        if (includeDizimoIgreja) {
          const dizimoIgrejaTransacao = {
            tipo: 'S',
            tipo_despesa: 'OT',
            descricao: 'Dízimo da Igreja',
            quantia: dizimoIgreja,
            data: lastDayOfMonth, // Usar o último dia do mês
          };
          await axios.post('/api/transacoes/nova/', dizimoIgrejaTransacao);
          transactions.push(dizimoIgrejaTransacao); // Adicionar ao array de transações
        }
      }

      // Agrupar dízimos por dia
      const groupedDizimos = transactions
        .filter((transaction) => transaction.tipo === 'D') // Filtrar apenas os dízimos
        .reduce((acc, transaction) => {
          const day = transaction.data.split('-')[2]; // Extrair o dia no formato "DD"
          if (!acc[day]) {
            acc[day] = 0; // Inicializar o valor do dia
          }
          acc[day] += parseFloat(transaction.quantia); // Somar os valores dos dízimos do mesmo dia
          return acc;
        }, {});

      // Adicionar os dízimos agrupados ao formattedData
      Object.keys(groupedDizimos).forEach((day) => {
        formattedData.push({
          dia: day.padStart(2, '0'), // Garantir que o dia tenha dois dígitos
          discriminacao: 'Dízimo',
          entrada: `R$ ${truncateToTwoDecimals(groupedDizimos[day])}`,
          saida: '-',
        });
      });

      // Adicionar as outras transações (não-dízimos) ao formattedData
      transactions
        .filter((transaction) => transaction.tipo !== 'D') // Excluir os dízimos já agrupados
        .forEach((transaction) => {
          const day = transaction.data.split('-')[2]; // Extrair o dia no formato "DD"
          let discriminacao = '';

          // Determinar a discriminação com base no tipo da transação
          if (transaction.tipo === 'O') {
            discriminacao = 'Oferta';
          } else if (transaction.tipo === 'S') {
            const tipoDespesa = getTipoDespesaDisplay(transaction.tipo_despesa);
            discriminacao = tipoDespesa === 'Outro' ? (transaction.descricao || 'Outro') : tipoDespesa;
          }

          formattedData.push({
            dia: day.padStart(2, '0'), // Garantir que o dia tenha dois dígitos
            discriminacao,
            entrada: transaction.tipo === 'O' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-',
            saida: transaction.tipo === 'S' ? `R$ ${truncateToTwoDecimals(parseFloat(transaction.quantia))}` : '-',
          });
        });

        // Adicionar 5 linhas vazias para preenchimento manual antes das transações extras
for (let i = 0; i < 5; i++) {
  formattedData.push({
    dia: '', // Campo vazio para o dia
    discriminacao: '', // Campo vazio para discriminação
    entrada: '', // Campo vazio para entrada
    saida: '', // Campo vazio para saída
  });
}

// Adicionar as transações extras ao final da tabela (somente se não forem criadas oficialmente no sistema)
if (!updateSystem) {
  if (includeGratificacao) {
    formattedData.push({
      dia: '',
      discriminacao: 'Gratificação do Líder',
      entrada: '-',
      saida: `R$ ${truncateToTwoDecimals(gratificacao)}`,
    });
  }

  if (includeDizimoGratificacao) {
    formattedData.push({
      dia: '',
      discriminacao: 'Dízimo da Gratificação',
      entrada: `R$ ${truncateToTwoDecimals(dizimoGratificacao)}`,
      saida: '-',
    });
  }

  if (includeDizimoIgreja) {
    formattedData.push({
      dia: '',
      discriminacao: 'Dízimo da Igreja',
      entrada: '-',
      saida: `R$ ${truncateToTwoDecimals(dizimoIgreja)}`,
    });
  }
}

      // Ordenar todas as transações no formattedData em ordem crescente de dias
      formattedData.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

      // Adicionar as transações extras ao final da tabela (somente se não forem criadas oficialmente no sistema)
      if (!updateSystem) {
        if (includeGratificacao) {
          formattedData.push({
            dia: '',
            discriminacao: 'Gratificação do Líder',
            entrada: '-',
            saida: `R$ ${truncateToTwoDecimals(gratificacao)}`,
          });
        }

        if (includeDizimoGratificacao) {
          formattedData.push({
            dia: '',
            discriminacao: 'Dízimo da Gratificação',
            entrada: `R$ ${truncateToTwoDecimals(dizimoGratificacao)}`,
            saida: '-',
          });
        }

        if (includeDizimoIgreja) {
          formattedData.push({
            dia: '',
            discriminacao: 'Dízimo da Igreja',
            entrada: '-',
            saida: `R$ ${truncateToTwoDecimals(dizimoIgreja)}`,
          });
        }
      }
      // Calcular totais do mês (incluindo transações extras)
      const totalEntradas = totalEntradasComGratificacao;
      const saldoMes = totalEntradas - totalSaidas; // Saldo do mês
      const totalEmCaixa = saldoAnterior + saldoMes; // Total em caixa

      // Gerar o PDF
      const doc = new jsPDF({
        format: 'a4',
        unit: 'mm',
      });

      // Cabeçalho
      try {
        doc.addImage(logo, 'PNG', 10, 10, 15, 15); // Reduzir tamanho da logo
      } catch (err) {
        console.error('Erro ao adicionar o logotipo:', err);
        setNotification({ message: 'Erro ao adicionar o logotipo ao PDF. Verifique o arquivo da imagem.', type: 'error' });
      }

      doc.setFontSize(11); // Reduzir tamanho da fonte do cabeçalho
      doc.setFont("times", "bold");
      doc.text('IGREJA DE DEUS MISSIONÁRIA', 105, 15, { align: 'center' });
      doc.setFontSize(9); // Fonte menor para subtítulos
      doc.setFont("times", "normal");
      doc.text('CNPJ: 05.869.914/0001-07', 105, 20, { align: 'center' });
      doc.text('DEPARTAMENTO FINANCEIRO', 105, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`MÊS: ${new Date(0, pdfMonth - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}`, 10, 35);
      doc.text(`ANO: ${pdfYear}`, 105, 35, { align: 'center' });
      doc.text('EBENÉZER', 200 - 10, 35, { align: 'right' });

      // Tabela
      autoTable(doc, {
        startY: 40,
        head: [['DIA', 'DISCRIMINAÇÃO', 'ENTRADA', 'SAÍDA']],
        body: formattedData.map((row) => [
          row.dia,
          row.discriminacao,
          row.entrada !== '-' ? row.entrada : '-',
          row.saida !== '-' ? row.saida : '-',
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8, // Reduzir tamanho da fonte do cabeçalho da tabela
        },
        styles: {
          fontSize: 7, // Reduzir tamanho da fonte do corpo da tabela
          cellPadding: 1, // Reduzir preenchimento interno das células
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 80 },
          2: { cellWidth: 40, halign: 'right' },
          3: { cellWidth: 40, halign: 'right' },
        },
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setFont("times", "bold");
      doc.text(`TOTAL DE ENTRADA: R$ ${truncateToTwoDecimals(totalEntradas)}`, 10, finalY);
      doc.text(`TOTAL DE SAÍDA DO MÊS: R$ ${truncateToTwoDecimals(totalSaidas)}`, 10, finalY + 5);
      doc.text(`SALDO DO MÊS: R$ ${saldoMes.toFixed(2)}`, 10, finalY + 10);
      doc.text(`SALDO ANTERIOR: R$ ${saldoAnterior.toFixed(2)}`, 10, finalY + 15);
      doc.text(`TOTAL EM CAIXA: R$ ${truncateToTwoDecimals(totalEmCaixa)}`, 10, finalY + 20);

      const signatureY = finalY + 30;
      doc.setFontSize(8);
      doc.setFont("times", "normal");
      doc.text('TESOUREIRO: ______________________________', 10, signatureY);
      doc.text('DIRIGENTE DA CONGREGAÇÃO: ______________________________', 10, signatureY + 5);
      doc.text('DIRETOR FINANCEIRO IDM SEDE: ______________________________', 10, signatureY + 10);
      doc.text('CONSELHO FISCAL: ______________________________', 10, signatureY + 15);

      doc.save(`relatorio_financeiro_${pdfMonth}_${pdfYear}.pdf`);

      const saveRelatorio = async (nome, mes, ano, pdfBlob) => {
        const formData = new FormData();
        formData.append('nome', nome);
        formData.append('mes', mes);
        formData.append('ano', ano);
        formData.append('arquivo', pdfBlob); // O arquivo PDF gerado

        try {
          const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/relatorios/salvar/`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          console.log('Relatório salvo com sucesso:', response.data);
        } catch (error) {
          console.error('Erro ao salvar relatório:', error);
        }
      };

      // Gerar o PDF como Blob
      const pdfBlob = doc.output('blob');
      await saveRelatorio(`relatorio_${pdfMonth}_${pdfYear}.pdf`, pdfMonth, pdfYear, pdfBlob);

      setNotification({ message: 'Relatório gerado com sucesso!', type: 'success' });
    } catch (err) {
      setNotification({ message: 'Erro ao gerar o relatório: ' + err.message, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Mês selecionado no modal:', pdfMonth);
  }, [pdfMonth]);


  const openReportOptions = async () => {
    try {
      if (!pdfMonth) {
        setNotification({ message: 'Por favor, selecione um mês para gerar o relatório.', type: 'error' });
        return;
      }

      const formattedMonth = pdfMonth.toString().padStart(2, '0'); // Garantir dois dígitos
      const axios = axiosLocal.create({
        baseURL: process.env.REACT_APP_API_URL,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const response = await axios.get(`/api/transacoes/?mes=${formattedMonth}&ano=${pdfYear}`);
      const transactions = response.data;

      const transaction_temp = response.data; // Usar as transações filtradas

      // Verificar e corrigir o formato da data, se necessário
      transaction_temp.forEach((transact) => {
        if (!transact.data || isNaN(new Date(transact.data).getTime())) {
          console.error(`Data inválida encontrada na hora de exbir no report ${transact.data}`);
        }
      });

      // Ordenar as transações por data em ordem crescente
      transaction_temp.sort((a, b) => {
        const dateA = new Date(a.data);
        const dateB = new Date(b.data);
        return dateA - dateB;
      });

      console.log('RECEBIDO:', transaction_temp.map((t) => t.data));

      if (transactions.length === 0) {
        setNotification({ message: 'Nenhuma transação encontrada para o mês selecionado.', type: 'error' });
      } else {
        setNotification({ message: 'Transações carregadas com sucesso!', type: 'success' });
      }

      setReportTransactions(transactions);

      // Calcular o saldo final para verificar se a gratificação é possível
      const totalEntradas = transactions
        .filter((t) => t.tipo === 'D' || t.tipo === 'O')
        .reduce((sum, t) => sum + parseFloat(t.quantia), 0);
      const totalSaidas = transactions
        .filter((t) => t.tipo === 'S')
        .reduce((sum, t) => sum + parseFloat(t.quantia), 0);

      const saldoFinal = totalEntradas - totalSaidas;

      setIsGratificacaoEnabled(saldoFinal >= 900);
    } catch (err) {
      setNotification({ message: 'Erro ao buscar transações para o relatório: ' + err.message, type: 'error' });
    }
  };

  return (
    <motion.div className="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <Navbar />

      <div className="dashboard-content">
        {isLoading && (
          <motion.div
            className="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            Carregando...
          </motion.div>
        )}
        {error && (
          <motion.div
            className="error-message"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {error}
            <button onClick={fetchData}>Tentar novamente</button>
          </motion.div>
        )}
        {!isLoading && !error && (
          <>
            <SaldoIndicator className="saldo-indicator" saldo={saldo} />

            {/* Botões de Criar Transação e Gerar PDF */}
            <div className="button-group">
              <motion.button
                className="dashboard-button"
                onClick={() => setShowForm(!showForm)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {showForm ? 'Fechar Formulário' : 'Criar Transação'}
              </motion.button>

              <motion.button
                className="dashboard-button pdf-button"
                onClick={async () => {
                  setPdfMonth(''); // Redefinir o estado ao abrir o modal
                  setPdfYear(new Date().getFullYear()); // Opcional: redefinir o ano também
                  setShowPdfOptions(true);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Gerar PDF
              </motion.button>
            </div>

            {showForm && (
              <motion.div
                className="form-container"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <TransactionForm onTransactionAdded={handleTransactionAdded} setNotification={setNotification} />
              </motion.div>
            )}


            {/* Modal de Opções do PDF */}
            {showPdfOptions && (
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.target === e.currentTarget && setShowPdfOptions(false)}
              >
                <motion.div
                  className="modal-content"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3>Opções do Relatório</h3>
                  <div className="pdf-options">
                    <div className="pdf-select-group">
                      <label>Mês</label>
                      <select
                        className="pdf-select"
                        value={pdfMonth}
                        onChange={(e) => {
                          const selectedMonth = e.target.value === '' ? '' : Number(e.target.value);
                          setPdfMonth(selectedMonth); // Atualizar o estado
                        }}
                      >
                        <option value="">Selecione o Mês</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="pdf-select-group">
                      <label>Ano</label>
                      <input
                        className="pdf-input"
                        type="number"
                        value={pdfYear}
                        onChange={(e) => setPdfYear(Number(e.target.value))}
                        min="2020"
                        max={new Date().getFullYear()}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={updateSystem}
                        onChange={(e) => setUpdateSystem(e.target.checked)}
                      />
                      Atualizar o sistema oficial (criar transações no sistema)
                    </label>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={includeGratificacao}
                        onChange={(e) => handleGratificacaoChange(e.target.checked)}
                        disabled={!isGratificacaoEnabled}
                      />
                      Incluir Gratificação do Pastor (R$ 900,00)
                    </label>
                    {!isGratificacaoEnabled && (
                      <p style={{ color: '#ffcc00', fontSize: '14px', marginTop: '5px' }}>
                        Aviso: O saldo atual não é suficiente para incluir a gratificação do pastor.
                      </p>
                    )}
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={includeDizimoGratificacao}
                        onChange={(e) => setIncludeDizimoGratificacao(e.target.checked)}
                        disabled={!includeGratificacao || !isGratificacaoEnabled}
                      />
                      Incluir Dízimo da Gratificação (10% da gratificação)
                    </label>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={includeDizimoIgreja}
                        onChange={(e) => setIncludeDizimoIgreja(e.target.checked)}
                      />
                      Incluir Dízimo da Igreja (10% das entradas)
                    </label>
                  </div>
                  <div className="button-group">
                    <button className="edit" onClick={openReportOptions}>
                      Buscar Transações
                    </button>
                    <button className="edit" onClick={generateMonthlyReport}>
                      Gerar Relatório
                    </button>
                    <button className="close" onClick={() => setShowPdfOptions(false)}>
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            <motion.button
              className="filter-toggle-button"
              onClick={() => setShowFilters(!showFilters)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}
            </motion.button>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  className="search-filters"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >

                  {/* Filtros */}
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
                  <div className="filter-group">
                    <div className="filter-item">
                      <label>Dia</label>
                      <div className="input-container">
                        <FaCalendarAlt />
                        <input
                          type="text"
                          value={searchDay}
                          onChange={(e) => setSearchDay(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="filter-item">
                      <label>Descrição</label>
                      <div className="input-container">
                        <FaSearch />
                        <input
                          type="text"
                          value={searchDescription}
                          onChange={(e) => setSearchDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="filter-item">
                      <label>Tipo</label>
                      <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
                        <option value="">Todos os Tipos</option>
                        <option value="D">Dízimo</option>
                        <option value="O">Oferta</option>
                        <option value="S">Despesa</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="transaction-list">
              <TransactionList
                transactions={currentTransactions}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTransactionClick={setSelectedTransaction}
                setTransactions={setTransactions}
                setNotification={setNotification}
              />
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <motion.button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Anterior
                </motion.button>

                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <motion.button
                    key={pageNumber}
                    onClick={() => handlePageClick(pageNumber)}
                    className={currentPage === pageNumber ? 'active' : ''}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {pageNumber}
                  </motion.button>
                ))}

                <motion.button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Próximo
                </motion.button>
              </div>
            )}

            {editingTransaction && (
              <EditTransactionModal
                transaction={editingTransaction}
                onClose={() => setEditingTransaction(null)}
                onSave={handleSave}
                setNotification={setNotification}
              />
            )}
            {selectedTransaction && (
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.target === e.currentTarget && setSelectedTransaction(null)}
              >
                <motion.div
                  className="modal-content"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3>Detalhes da Transação</h3>
                  <p>
                    <strong>Tipo:</strong> {getTipoDisplay(selectedTransaction.tipo)}
                  </p>
                  <p>
                    <strong>Valor:</strong> R$ {selectedTransaction.quantia}
                  </p>
                  <p>
                    <strong>Data:</strong> {formatDate(selectedTransaction.data)}
                  </p>
                  {selectedTransaction.tipo === 'D' && (
                    <p>
                      <strong>Contribuinte:</strong> {selectedTransaction.nome || '-'}
                    </p>
                  )}
                  {selectedTransaction.tipo === 'O' && (
                    <p>
                      <strong>Culto:</strong> {getCultoDisplay(selectedTransaction.culto) || '-'}
                    </p>
                  )}
                  {selectedTransaction.tipo === 'S' && (
                    <p>
                      <strong>Tipo de Despesa:</strong> {getTipoDespesaDisplay(selectedTransaction.tipo_despesa) || '-'}
                    </p>
                  )}
                  <p>
                    <strong>Descrição:</strong> {selectedTransaction.descricao || '-'}
                  </p>
                  <div className="button-group">
                    <button className="edit" onClick={() => handleEdit(selectedTransaction)}>
                      Editar
                    </button>
                    <button className="delete" onClick={() => handleDelete(selectedTransaction)}>
                      Excluir
                    </button>
                    <button className="close" onClick={() => setSelectedTransaction(null)}>
                      Fechar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
            <ConfirmationModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onConfirm={confirmDelete}
              message="Tem certeza que deseja excluir esta transação?"
            />

            {/* Modal de Opções do Relatório */}
            {showReportOptions && (
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={(e) => e.target === e.currentTarget && setShowReportOptions(false)}
              >
                <motion.div
                  className="modal-content"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3>Opções do Relatório</h3>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={includeGratificacao}
                        onChange={(e) => setIncludeGratificacao(e.target.checked)}
                        disabled={!isGratificacaoEnabled}
                      />
                      Incluir Gratificação do Pastor (R$ 900,00)
                    </label>
                    {!isGratificacaoEnabled && (
                      <p style={{ color: '#ffcc00', fontSize: '14px', marginTop: '5px' }}>
                        Aviso: O saldo atual não é suficiente para incluir a gratificação do pastor.
                      </p>
                    )}
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={includeDizimoGratificacao}
                        onChange={(e) => setIncludeDizimoGratificacao(e.target.checked)}
                        disabled={!includeGratificacao}
                      />
                      Incluir Dízimo da Gratificação (10% da gratificação)
                    </label>
                  </div>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={includeDizimoIgreja}
                        onChange={(e) => setIncludeDizimoIgreja(e.target.checked)}
                      />
                      Incluir Dízimo da Igreja (10% das entradas)
                    </label>
                  </div>
                  <div className="button-group">
                    <button className="edit" onClick={generateMonthlyReport}>
                      Gerar Relatório
                    </button>
                    <button className="close" onClick={() => setShowReportOptions(false)}>
                      Cancelar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </>
        )}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;