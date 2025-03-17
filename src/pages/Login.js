import React from 'react';
     import './Login.css';

     const Login = () => {
       return (
         <div className="login">
           <h2>Login</h2>
           <form>
             <input type="email" placeholder="Email" />
             <input type="password" placeholder="Senha" />
             <button type="submit">Entrar</button>
           </form>
         </div>
       );
     };

     export default Login;