import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Função para configurar o token em todas as requisições
const setupAxiosInterceptors = (navigate) => {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // Token expirado ou inválido
        localStorage.removeItem('token'); // Remove o token expirado
        navigate('/login'); // Redireciona para o login
        return Promise.reject(new Error('Sessão expirada. Por favor, faça login novamente.'));
      }
      return Promise.reject(error);
    }
  );
};

export const fetchTransactions = async (month, year, navigate, igrejaId = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Nenhum token encontrado. Por favor, faça login.');
    }

    const params = {};
    if (month) params.mes = month;
    if (year) params.ano = year;
    if (igrejaId) params.igreja_id = igrejaId;

    const response = await axios.get(`${API_URL}/api/transacoes/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const fetchSaldo = async (navigate, igrejaId = null, mes = null, ano = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Nenhum token encontrado. Por favor, faça login.');
    }
    const params = {};
    if (igrejaId) params.igreja_id = igrejaId;
    if (mes) params.mes = mes;
    if (ano) params.ano = ano;
    const response = await axios.get(`${API_URL}/api/saldo/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params,
    });
    return response.data.saldo;
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

export const deleteTransaction = async (id, navigate) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Nenhum token encontrado. Por favor, faça login.');
    }

    await axios.delete(`${API_URL}/api/transacoes/${id}/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Exporta a função para configurar os interceptors
export { setupAxiosInterceptors };