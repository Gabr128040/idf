import React, { useState } from 'react';
     import { Link } from 'react-router-dom';
     import './Navbar.css';

     const Navbar = () => {
       const [isOpen, setIsOpen] = useState(false);

       return (
         <nav className="navbar">
           <div className="navbar-logo">IMDB</div>
           <div className={`navbar-links ${isOpen ? 'active' : ''}`}>
             <Link to="/">Painel</Link>
             <Link to="/login">Login</Link>
             <Link to="/register">Cadastro</Link>
             <Link to="/database">Banco de Dados</Link>
           </div>
           <div className="navbar-toggle" onClick={() => setIsOpen(!isOpen)}>
             <span></span>
             <span></span>
             <span></span>
           </div>
         </nav>
       );
     };

     export default Navbar;