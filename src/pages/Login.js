import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo.png';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/login/`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      localStorage.setItem('token', response.data.access);
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        if (response.data.user.is_superuser || response.data.user.is_igreja_admin) {
          navigate('/');
        } else {
          navigate('/');
        }
      } else {
        setError('Usuário ou senha inválidos.');
      }
    } catch (error) {
      setError('Usuário ou senha inválidos.');
      // Log detalhado para depuração
      if (error.response) {
        console.error('Erro de login:', error.response.data);
      } else {
        console.error('Erro de login:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-landing-bg">
      <div className="login-landing-card">
        <div className="login-landing-header">
          <img src={logo} alt="Logo IDM" className="login-landing-logo" />
        </div>
        <form className="login-landing-form" onSubmit={handleSubmit} autoComplete="off">
          <input
            type="text"
            name="username"
            placeholder="Usuário"
            value={formData.username}
            onChange={handleChange}
            required
            autoFocus
            className="login-landing-input"
            disabled={loading}
          />
          <input
            type="password"
            name="password"
            placeholder="Senha"
            value={formData.password}
            onChange={handleChange}
            required
            className="login-landing-input"
            disabled={loading}
          />
          <button type="submit" className="login-landing-btn" disabled={loading}>
            {loading ? <span className="login-spinner" /> : 'Entrar'}
          </button>
        </form>
        {error && (
          <div className="login-landing-error animate-fadein">{error}</div>
        )}
      </div>
      <style>{`
        .login-landing-bg {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(120deg, #e3e9f7 0%, #f7f8fa 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-landing-card {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 32px #4f8cff22;
          padding: 38px 32px 24px 32px;
          max-width: 370px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }
        .login-landing-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 8px;
        }
        .login-landing-logo {
          width: 110px;
          height: 110px;
          margin-bottom: 18px;
          transition: width 0.2s, height 0.2s;
        }
        @media (max-width: 600px) {
          .login-landing-bg {
            margin-left: 0;
            margin-right: 0;
          }
          .login-landing-card {
            max-width: 92vw;
            padding: 14px 3vw 10px 3vw;
          }
        }
        .login-landing-title {
          font-size: 2rem;
          font-weight: 800;
          color: #4f8cff;
          margin-bottom: 2px;
          letter-spacing: 0.5px;
        }
        .login-landing-desc {
          color: #23272f;
          font-size: 1.01rem;
          margin-bottom: 0;
          text-align: center;
        }
        .login-landing-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 8px;
        }
        .login-landing-input {
          border-radius: 8px;
          border: 1.5px solid #4f8cff;
          padding: 10px 14px;
          font-size: 1.08rem;
          background: #f7fafc;
          color: #23272f;
          transition: border 0.2s;
          box-shadow: 0 1px 4px #0001;
        }
        .login-landing-input:focus {
          border: 1.5px solid #357ae8;
          outline: none;
        }
        .login-landing-btn {
          border: none;
          border-radius: 8px;
          padding: 12px 0;
          font-weight: 700;
          font-size: 1.08rem;
          background: #4f8cff;
          color: #fff;
          box-shadow: 0 2px 8px #4f8cff22;
          cursor: pointer;
          transition: background 0.18s;
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-landing-btn:disabled {
          background: #b3c6f7;
          cursor: not-allowed;
        }
        .login-spinner {
          border: 4px solid #e3e9f7;
          border-top: 4px solid #4f8cff;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          animation: zz-spin 0.9s linear infinite;
        }
        @keyframes zz-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .login-landing-error {
          color: #e74c3c;
          background: #fff0f0;
          border-radius: 8px;
          padding: 10px 0;
          margin-top: 10px;
          width: 100%;
          text-align: center;
          font-weight: 600;
          font-size: 1.01rem;
          box-shadow: 0 1px 4px #e74c3c11;
        }
        .animate-fadein {
          animation: fadein 0.5s;
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Login;