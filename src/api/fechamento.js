import axiosLocal from 'axios';

export async function verificarFechamento(igrejaId, mes, ano) {
  try {
    const response = await axiosLocal.get(`${process.env.REACT_APP_API_URL}/api/fechamento/status/${igrejaId}/${mes}/${ano}/`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // Mês não fechado ainda
      return null;
    }
    throw new Error('Erro ao verificar fechamento: ' + (error.response?.data?.message || error.message));
  }
}