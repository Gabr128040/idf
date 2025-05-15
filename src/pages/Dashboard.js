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

  const [previewData, setPreviewData] = useState({
  totalEntradas: 0,
  totalSaidas: 0,
  saldoAnterior: 0,
  saldoMes: 0,
  saldoFinal: 0,
  dizimoIgreja: 0,
});

  const [searchDay, setSearchDay] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [searchType, setSearchType] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  const navigate = useNavigate();

  const [isGratificacaoEnabled, setIsGratificacaoEnabled] = useState(true);
  const [showPdfOptions, setShowPdfOptions] = useState(false); // Estado para exibir o menu de PDF
const [pdfMonth, setPdfMonth] = useState(new Date().getMonth() + 1); // Mês atual (1-12)
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

useEffect(() => {
  if (reportTransactions.length > 0) {
    calculatePreview(reportTransactions); // Recalcular a prévia
  }
}, [includeGratificacao, includeDizimoGratificacao, includeDizimoIgreja, reportTransactions]);

const calculatePreview = async (transactions) => {
  // Calcular total de entradas (dízimos e ofertas)
  let totalEntradas = transactions
    .filter((t) => t.tipo === 'D' || t.tipo === 'O')
    .reduce((sum, t) => sum + parseFloat(t.quantia || 0), 0);

  // Calcular total de saídas (despesas)
  let totalSaidas = transactions
    .filter((t) => t.tipo === 'S')
    .reduce((sum, t) => sum + parseFloat(t.quantia || 0), 0);

  // Simular transações extras
  let gratificacao = includeGratificacao ? 900 : 0;
  let dizimoGratificacao = includeDizimoGratificacao ? 90 : 0;

  // Adicionar o dízimo da gratificação ao total de entradas, se o checkbox estiver selecionado
  if (includeDizimoGratificacao) {
    totalEntradas += dizimoGratificacao;
  }

  // Calcular o dízimo da igreja com base no total de entradas atualizado
  let dizimoIgreja = includeDizimoIgreja ? truncateToTwoDecimals(totalEntradas * 0.1) : 0;

  // Adicionar a gratificação e o dízimo da igreja ao total de saídas, se os checkboxes estiverem selecionados
  if (includeGratificacao) {
    totalSaidas += gratificacao;
  }
  if (includeDizimoIgreja) {
    totalSaidas += dizimoIgreja;
  }

  // Buscar saldo do mês anterior
  let saldoAnterior = 0;
  try {
  const currentMonth = pdfMonth || new Date().getMonth() + 1; // Garantir que pdfMonth tenha um valor válido
  const currentYear = pdfYear || new Date().getFullYear(); // Garantir que pdfYear tenha um valor válido

  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  console.log('Mês anterior:', previousMonth, 'Ano anterior:', previousYear); // Log para depuração

  const formattedPreviousMonth = previousMonth.toString().padStart(2, '0'); // Garantir dois dígitos

  const axios = axiosLocal.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

    const response = await axios.get(`/api/transacoes/?mes=${previousMonth}&ano=${previousYear}`);
    const previousTransactions = response.data;

    const previousEntradas = previousTransactions
      .filter((t) => t.tipo === 'D' || t.tipo === 'O')
      .reduce((sum, t) => sum + parseFloat(t.quantia || 0), 0);

    const previousSaidas = previousTransactions
      .filter((t) => t.tipo === 'S')
      .reduce((sum, t) => sum + parseFloat(t.quantia || 0), 0);

    saldoAnterior = previousEntradas - previousSaidas;
  } catch (err) {
    console.error('Erro ao buscar saldo do mês anterior:', err);
  }

  // Calcular saldo do mês e saldo final
  const saldoMes = totalEntradas - totalSaidas;
  const saldoFinal = saldoAnterior + saldoMes;

  console.log('Prévia calculada:', {
    totalEntradas,
    totalSaidas,
    gratificacao,
    dizimoGratificacao,
    dizimoIgreja,
    saldoAnterior,
    saldoMes,
    saldoFinal,
  });

  // Atualizar o estado com os valores calculados
  setPreviewData({
    totalEntradas,
    totalSaidas,
    saldoAnterior,
    saldoMes,
    saldoFinal,
    dizimoIgreja,
  });
};


  const generateMonthlyReport = async () => {

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

      // Calcular saldo anterior
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
         const saldoAnterior = previewData.saldoAnterior;

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


const lastDayOfMonth = getLastDayOfMonth(pdfYear, pdfMonth || new Date().getMonth() + 1);
if (!lastDayOfMonth || isNaN(new Date(lastDayOfMonth).getTime())) {
  throw new Error('Data inválida calculada para o último dia do mês.');
}
console.log('pdfMonth:', pdfMonth, 'pdfYear:', pdfYear);
console.log('Último dia do mês:', lastDayOfMonth);

      // Criar oficialmente no site apenas se os checkboxes estiverem ativados
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


      // Ordenar todas as transações no formattedData em ordem crescente de dias
      formattedData.sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

      
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

      const finalY = doc.lastAutoTable.finalY - 5;

      // Adicionar informações finais com destaque
      const infoBoxX = 10; // Posição X inicial do contêiner
      const infoBoxY = finalY + 10; // Posição Y inicial do contêiner
      const infoBoxWidth = 180; // Largura do contêiner
      const infoBoxHeight = 25; // Altura do contêiner
      
      // Desenhar o contêiner (opcional, para destacar as informações)
      doc.setDrawColor(0); // Cor da borda (preto)
      doc.setFillColor(240, 240, 240); // Cor de fundo (cinza claro)
      doc.rect(infoBoxX, infoBoxY, infoBoxWidth, infoBoxHeight, 'FD'); // Desenhar o retângulo preenchido
      
      // Adicionar as informações dentro do contêiner
      const infoStartX = infoBoxX + 5; // Margem interna para o texto
      let infoStartY = infoBoxY + 4; // Margem superior para o texto
      
      doc.setFontSize(9);
      doc.setFont("times", "bold");
      doc.text('TOTAL DE ENTRADA:', infoStartX, infoStartY);
      doc.text(`R$ ${truncateToTwoDecimals(totalEntradas)}`, infoStartX + 60, infoStartY);
      
      infoStartY += 4; // Próxima linha
      doc.text('TOTAL DE SAÍDA DO MÊS:', infoStartX, infoStartY);
      doc.text(`R$ ${truncateToTwoDecimals(totalSaidas)}`, infoStartX + 60, infoStartY);
      
      infoStartY += 4; // Próxima linha
      doc.text('SALDO DO MÊS:', infoStartX, infoStartY);
      doc.text(`R$ ${saldoMes.toFixed(2)}`, infoStartX + 60, infoStartY);
      
      infoStartY += 4; // Próxima linha
      doc.text('SALDO ANTERIOR:', infoStartX, infoStartY);
      doc.text(`R$ ${saldoAnterior.toFixed(2)}`, infoStartX + 60, infoStartY);
      
      infoStartY += 4; // Próxima linha
      doc.text('TOTAL EM CAIXA:', infoStartX, infoStartY);
      doc.text(`R$ ${truncateToTwoDecimals(totalEmCaixa)}`, infoStartX + 60, infoStartY);

      const signatureY = infoBoxY + infoBoxHeight + 6; // Posicionar as assinaturas abaixo do contêiner
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
    await updateTransactions();

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
    const currentMonth = new Date().getMonth() + 1; // Mês atual (1-12)
    const currentYear = new Date().getFullYear(); // Ano atual
    console.log('Mês atual:', currentMonth, 'Ano atual:', currentYear); // Log para depuração

    setPdfMonth(currentMonth); // Definir o mês atual
    setPdfYear(currentYear); // Definir o ano atual
    console.log('Estado pdfMonth após setPdfMonth:', currentMonth); // Verificar se o estado foi atualizado

    const formattedMonth = currentMonth.toString().padStart(2, '0'); // Garantir dois dígitos
    const axios = axiosLocal.create({
      baseURL: process.env.REACT_APP_API_URL,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    const response = await axios.get(`/api/transacoes/?mes=${formattedMonth}&ano=${currentYear}`);
    const transactions = response.data;

    setReportTransactions(transactions);

    console.log('RECEBIDO:', transactions.map((t) => t.data));

    // Calcular a prévia
    calculatePreview(transactions);
  } catch (err) {
    setNotification({ message: 'Erro ao carregar transações: ' + err.message, type: 'error' });
  }
};

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', margin: '32px 0 18px 0', color: '#4f8cff', fontWeight: 500 }}>
        Carregando dados...
        <div className="zz-skeleton-list">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="zz-skeleton-item" />
          ))}
        </div>
        <style>{`
          .zz-skeleton-list { margin-top: 12px; }
          .zz-skeleton-item { height: 38px; background: #e3e9f7; border-radius: 8px; margin-bottom: 8px; animation: zz-skel 1.2s infinite linear alternate; }
          @keyframes zz-skel { 0% { opacity: 0.5; } 100% { opacity: 1; } }
        `}</style>
      </div>
    );
  }
  if (error) {
    return <div style={{ color: '#e74c3c', textAlign: 'center', margin: '32px 0 18px 0', fontWeight: 500 }}>{error}</div>;
  }
  if (!transactions.length) {
    return <div style={{ textAlign: 'center', marginTop: 18 }}>Nenhuma transação encontrada.</div>;
  }

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
                  await openReportOptions();
                  setShowPdfOptions(true);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Fechar Relatório
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
      <h3>Fechamento do Mês: {new Date(0, pdfMonth - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} de {pdfYear}</h3>
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
      {previewData && (
        <div className="preview-section">
          <h4>Prévia do Relatório</h4>
          <p>Total de Entradas: R$ {previewData.totalEntradas.toFixed(2)}</p>
          <p>Total de Saídas: R$ {previewData.totalSaidas.toFixed(2)}</p>
          <p>Saldo do Mês: R$ {previewData.saldoMes.toFixed(2)}</p>
          <p>Saldo Anterior: R$ {previewData.saldoAnterior.toFixed(2)}</p>
          <p>Saldo Final: R$ {previewData.saldoFinal.toFixed(2)}</p>
          <p>Dízimo da Igreja: R$ {previewData.dizimoIgreja.toFixed(2)}</p>
        </div>
      )}
      <div className="button-group">
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