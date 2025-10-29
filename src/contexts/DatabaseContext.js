import React, { createContext, useState, useContext } from 'react';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const [databaseError, setDatabaseError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const setError = (message) => {
    setDatabaseError(true);
    setErrorMessage(message || 'Não foi possível conectar ao banco de dados. Verifique se o banco está ativo (Supabase).');
  };

  const clearError = () => {
    setDatabaseError(false);
    setErrorMessage('');
  };

  return (
    <DatabaseContext.Provider value={{ databaseError, errorMessage, setError, clearError }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export default DatabaseContext;