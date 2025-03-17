import React, { useEffect, useState } from 'react';
     import axios from 'axios';
     import './TransactionList.css';

     const TransactionList = () => {
       const [transactions, setTransactions] = useState([]);

       useEffect(() => {
       const fetchTransactions = async () => {
         try {
           const token = localStorage.getItem('token');
           const response = await axios.get('https://idf-ip90.onrender.com/api/transacoes/', {
             headers: {
               'Authorization': `Token ${token}`,
             },
           });
           setTransactions(response.data);
         } catch (error) {
           console.error('Erro ao buscar transações:', error);
         }
       };

       fetchTransactions();
     }, []);

       return (
         <div className="transaction-list">
           <h2>Transações</h2>
           <ul>
             {transactions.map((transaction) => (
               <li key={transaction.id} className={transaction.tipo === 'S' ? 'despesa' : ''}>
                 <span>{transaction.get_tipo_display()}</span>
                 <span>{transaction.valor}</span>
                 <span>{transaction.descricao}</span>
               </li>
             ))}
           </ul>
         </div>
       );
     };

     export default TransactionList;