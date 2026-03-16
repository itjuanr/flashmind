import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const SESSION_KEY = 'fm_token';
const EXPIRY_KEY  = 'fm_token_expiry';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 dias

function saveSession(token) {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem('token'); // limpa chave legada também
}

function getValidToken() {
  // Migração: se ainda tiver o token legado, migra para fm_token
  const legacy = localStorage.getItem('token');
  if (legacy) {
    saveSession(legacy);
    localStorage.removeItem('token');
    return legacy;
  }

  const token  = localStorage.getItem(SESSION_KEY);
  const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
  if (!token) return null;
  // Se não tiver expiry (token antigo sem expiração), renova
  if (!expiry) { saveSession(token); return token; }
  if (Date.now() > expiry) { clearSession(); return null; }
  return token;
}

function touchSession() {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return;
  const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
  if (!expiry || (expiry - Date.now()) < 6 * 24 * 60 * 60 * 1000) {
    localStorage.setItem(EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const touchTimer = useRef(null);

  useEffect(() => {
    const token = getValidToken();
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then((res) => { setUser(res.data); touchSession(); })
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  // Renova expiração ao interagir (throttle 60s)
  useEffect(() => {
    if (!user) return;
    const handler = () => {
      if (touchTimer.current) return;
      touchTimer.current = setTimeout(() => {
        touchSession();
        touchTimer.current = null;
      }, 60_000);
    };
    window.addEventListener('click', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
      clearTimeout(touchTimer.current);
    };
  }, [user]);

  // Verifica expiração a cada minuto
  useEffect(() => {
    const id = setInterval(() => {
      if (user && !getValidToken()) setUser(null);
    }, 60_000);
    return () => clearInterval(id);
  }, [user]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    saveSession(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    saveSession(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);