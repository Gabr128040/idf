import React, { useState } from 'react';
import axios from 'axios'; // Importação do axios
import { useNavigate } from 'react-router-dom'; // Importação do useNavigate
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const navigate = useNavigate(); // Hook para redirecionamento

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('https://idf-ip90.onrender.com/api/login/', formData);
      localStorage.setItem('token', response.data.access); // Armazena o token
      navigate('/'); // Redireciona para a página inicial
    } catch (error) {
      console.error('Erro ao fazer login:', error.response ? error.response.data : error.message);
    }
  };

  return (
    <div className="login">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Usuário"
          value={formData.username}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Senha"
          value={formData.password}
          onChange={handleChange}
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
};

export default Login;