import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const runBackup = async (target = 'all') => {
  // target: 'database' | 'reports' | 'all'
  const url = `${API_URL}/api/backup/run/`;
  const headers = getAuthHeaders();
  const response = await axios.post(url, { target }, { headers });
  return response.data;
};

export const listBackups = async (page = 1, page_size = 50) => {
  const url = `${API_URL}/api/backup/list/`;
  const headers = getAuthHeaders();
  const response = await axios.get(url, { headers, params: { page, page_size } });
  return response.data;
};

export default { runBackup, listBackups };
