import React, { useState } from 'react';
     import axios from 'axios';
     import './TransactionForm.css';

     const TransactionForm = () => {
       const [formData, setFormData] = useState({
         tipo: 'D',
         valor: '',
         descricao: '',
       });

       const handleChange = (e) => {
         setFormData({ ...formData, [e.target.name]: e.target.value });
       };

       const handleSubmit = async (e) => {
       e.preventDefault();
       try {
         const token = localStorage.getItem('token');
         await axios.post('https://idf-ip90.onrender.com/api/transacoes/', formData, {
           headers: {
             'Authorization': `Token ${token}`,
           },
         });
         alert('Transação adicionada com sucesso!');
       } catch (error) {
         console.error('Erro ao adicionar transação:', error);
       }
     };

       return (
         <form className="transaction-form" onSubmit={handleSubmit}>
           <select name="tipo" value={formData.tipo} onChange={handleChange}>
             <option value="D">Dizimo</option>
             <option value="O">Oferta</option>
             <option value="S">Despesa</option>
           </select>
           <input
             type="number"
             name="valor"
             placeholder="Valor"
             value={formData.valor}
             onChange={handleChange}
           />
           <textarea
             name="descricao"
             placeholder="Descrição"
             value={formData.descricao}
             onChange={handleChange}
           />
           <button type="submit">Enviar</button>
         </form>
       );
     };

     export default TransactionForm;
     
     