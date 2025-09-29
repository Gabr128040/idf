import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBars, FaTimes } from 'react-icons/fa';
import './Navbar.css';

const Navbar = () => {
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <>
      <div className="navbar">
        <h1>IMDB</h1>
        <motion.button
          onClick={() => setShowMenu(!showMenu)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {showMenu ? <FaTimes /> : <FaBars />}
        </motion.button>
      </div>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            className="nav-menu"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <ul>
              <li>
                <a href="/" onClick={() => setShowMenu(false)}>
                  Painel
                </a>
              </li>
              <li>
                <a href="/relatorios">Relatórios</a>
              </li>
              {/* Admin link removed to restore previous navigation */}
              <li>
                <a href="/login" onClick={() => setShowMenu(false)}>
                  Login
                </a>
              </li>
              <li>
                <a href="/register" onClick={() => setShowMenu(false)}>
                  Cadastro
                </a>
              </li>
              <li>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowMenu(false);
                  }}
                >
                  Sair
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;