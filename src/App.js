import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';
import DatabaseErrorBanner from './components/DatabaseErrorBanner';
import { DatabaseProvider } from './contexts/DatabaseContext';
import './App.css';
  import Relatorios from './pages/Relatorios';
import Monitoring from './pages/Monitoring';

     const App = () => {
  const [dbError, setDbError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Escuta eventos de erro de conexão com o banco
    const handleDbError = (event) => {
      setDbError(true);
      setErrorMessage(event.detail.message);
    };

    window.addEventListener('database-connection-error', handleDbError);

    return () => {
      window.removeEventListener('database-connection-error', handleDbError);
    };
  }, []);

  const handleRetry = () => {
    // Recarrega a página para tentar novamente
    window.location.reload();
  };

  return (
    <DatabaseProvider>
      <Router>
        <DatabaseErrorBanner 
          isVisible={dbError} 
          message={errorMessage}
          onRetry={handleRetry}
        />
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/monitoramento" element={<PrivateRoute><Monitoring /></PrivateRoute>} />
        </Routes>
      </Router>
    </DatabaseProvider>
  );
     };

     export default App;