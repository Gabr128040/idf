import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

// Função para simular fechamento do mês
export const simularFechamento = async (mes, ano, navigate) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Nenhum token encontrado. Por favor, faça login.');
    }

    const response = await axios.get(`${API_URL}/api/simular-fechamento/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { mes, ano }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.message);
  }
};

// Função para configurar o token e detectar erros de conexão em todas as requisições
const setupAxiosInterceptors = (navigate) => {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      // Se não houver resposta do servidor ou erro de conexão
      if (!error.response || error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
        // Dispara evento personalizado para notificar erro de conexão
        const event = new CustomEvent('database-connection-error', {
          detail: { message: 'Não foi possível conectar ao banco de dados. Verifique se o banco está ativo (Supabase).' }
        });
        window.dispatchEvent(event);
      }
      
      // Token expirado
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
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

export const fetchSaldo = async (navigate, igrejaId = null, mes = null, ano = null, tipo = 'atual') => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Nenhum token encontrado. Por favor, faça login.');
    }
    if (!igrejaId) {
      throw new Error('Igreja ID é obrigatório');
    }
    
    const params = {
      igreja_id: igrejaId,
      tipo
    };
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

export const createManualTransaction = async (transacao, navigate) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Nenhum token encontrado. Por favor, faça login.');
    }
    await axios.post(`${API_URL}/api/transacoes/nova/`, transacao, {
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