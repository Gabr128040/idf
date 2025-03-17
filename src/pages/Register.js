import React from 'react';
     import './Register.css';

     const Register = () => {
       return (
         <div className="register">
           <h2>Cadastro</h2>
           <form>
             <input type="text" placeholder="Nome" />
             <input type="email" placeholder="Email" />
             <input type="password" placeholder="Senha" />
             <button type="submit">Cadastrar</button>
           </form>
         </div>
       );
     };

     export default Register;