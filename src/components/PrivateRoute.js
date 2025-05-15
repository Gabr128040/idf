import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, adminOnly }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/login" />;
  if (adminOnly && !(user.is_superuser || user.is_igreja_admin)) return <Navigate to="/" />;
  return children;
};

export default PrivateRoute;