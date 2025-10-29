import React, { useState, useEffect } from 'react';
import './DatabaseErrorBanner.css';

const DatabaseErrorBanner = ({ isVisible, message, onRetry }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isVisible);
  }, [isVisible]);

  if (!show) return null;

  return (
    <div className="database-error-banner">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12" y2="16" />
      </svg>
      <span>
        {message || 'Não foi possível conectar ao banco de dados. Verifique se o banco está ativo (Supabase).'}
      </span>
      <button onClick={onRetry}>Tentar novamente</button>
    </div>
  );
};

export default DatabaseErrorBanner;