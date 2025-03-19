import React, { useState } from 'react';
import axios from 'axios'; // Importação do axios
import { useNavigate } from 'react-router-dom'; // Importação do useNavigate
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const navigate = useNavigate(); // Hook para redirecionamento

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('https://idf-ip90.onrender.com/api/register/', formData);
      console.log('Cadastro realizado com sucesso:', response.data);
      navigate('/login'); // Redireciona para a página de login
    } catch (error) {
      console.error('Erro ao registrar:', error.response ? error.response.data : error.message);
    }
  };

  return (
    <div className="register">
      <h2>Cadastro</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Usuário"
          value={formData.username}
          onChange={handleChange}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Senha"
          value={formData.password}
          onChange={handleChange}
        />
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
};

export default Register;