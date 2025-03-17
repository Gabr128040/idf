import React, { useState } from 'react';
     import TransactionForm from '../components/TransactionForm';
     import TransactionList from '../components/TransactionList';
     import './Dashboard.css';

     const Dashboard = () => {
       const [showForm, setShowForm] = useState(false);

       return (
         <div className="dashboard">
           <button className="dashboard-button" onClick={() => setShowForm(!showForm)}>
             Criar/Editar/Deletar Registro
           </button>
           {showForm && <TransactionForm />}
           <TransactionList />
         </div>
       );
     };

     export default Dashboard;