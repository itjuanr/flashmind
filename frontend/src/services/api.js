import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE.endsWith('/api') ? BASE : `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  maxBodyLength: 50 * 1024 * 1024,
  maxContentLength: 50 * 1024 * 1024,
});

// Injeta o token JWT em toda requisição automaticamente
api.interceptors.request.use((config) => {
  // Prioriza o 'token' novo. Se houver 'fm_token' antigo, usa como fallback
  const token = localStorage.getItem('token') || localStorage.getItem('fm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redireciona para login se o token expirar
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('fm_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;