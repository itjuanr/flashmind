import axios from 'axios';

// Verifica se existe a variável de ambiente, se não, usa o localhost
// Se você usa Vite, o prefixo deve ser VITE_
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: baseURL,
  headers: { 'Content-Type': 'application/json' },
  maxBodyLength: 50 * 1024 * 1024,
  maxContentLength: 50 * 1024 * 1024,
});

// Injeta o token JWT em toda requisição automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redireciona para login se o token expirar
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;