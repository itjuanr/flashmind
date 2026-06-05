import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE.endsWith('/api') ? BASE : `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  maxBodyLength: 50 * 1024 * 1024,
  maxContentLength: 50 * 1024 * 1024,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('fm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');

    if (err.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      localStorage.removeItem('fm_token');
      
      const path = window.location.pathname;
      const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/contact'];
      const isPublicDynamicRoute = path.startsWith('/reset-password/') || path.startsWith('/verify-email/') || path.startsWith('/share/');
      
      if (!publicRoutes.includes(path) && !isPublicDynamicRoute) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;