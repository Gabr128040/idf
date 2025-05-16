import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Importação do axios
import { useNavigate } from 'react-router-dom'; // Importação do useNavigate
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [igrejas, setIgrejas] = useState([]);

  const navigate = useNavigate(); // Hook para redirecionamento

  useEffect(() => {
    // Buscar lista de igrejas ao carregar a tela
    const fetchIgrejas = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/igrejas/`);
        setIgrejas(res.data);
      } catch (err) {
        setIgrejas([]);
      }
    };
    fetchIgrejas();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/register/`, formData);
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
        <select
          name="igreja_id"
          value={formData.igreja_id || ''}
          onChange={handleChange}
          required
        >
          <option value="">Selecione a Igreja</option>
          {igrejas.map((igreja) => (
            <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
          ))}
        </select>
        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
};

export default Register;