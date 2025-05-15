import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[DEBUG] handleSubmit chamado'); // Depuração
    console.log('[DEBUG] Dados do formulário:', formData); // Depuração
    console.log('[DEBUG] URL da API:', process.env.REACT_APP_API_URL); // Depuração
    console.log('[DEBUG] URL completa:', `${process.env.REACT_APP_API_URL}/api/login/`); // Depuração
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/login/`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json', // Garantir que o cabeçalho está correto
          },
        }
      );
      console.log('[DEBUG] Resposta do login:', response.data);
      localStorage.setItem('token', response.data.access);
      console.log('[DEBUG] Token salvo:', response.data.access);
      // Salva o usuário e tipo no localStorage
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Redireciona para o painel correto
        if (response.data.user.is_superuser || response.data.user.is_igreja_admin) {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
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
          required // Adicionar validação
        />
        <input
          type="password"
          name="password"
          placeholder="Senha"
          value={formData.password}
          onChange={handleChange}
          required // Adicionar validação
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
};

export default Login;