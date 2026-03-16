import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

// Duração da sessão: 7 dias em ms
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
const SESSION_KEY  = 'fm_token';
const EXPIRY_KEY   = 'fm_token_expiry';

function saveSession(token) {
  const expiry = Date.now() + SESSION_DURATION;
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(EXPIRY_KEY, expiry.toString());
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

function getValidToken() {
  const token  = localStorage.getItem(SESSION_KEY);
  const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
  if (!token || !expiry) return null;
  if (Date.now() > expiry) { clearSession(); return null; } // expirado
  return token;
}

// Renova o timer de expiração a cada interação do usuário (max 1x por minuto)
function touchSession() {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return;
  const expiry = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
  const timeLeft = expiry - Date.now();
  // Renova se faltar menos de 6 dias (ou seja, já usou pelo menos 1 dia)
  if (timeLeft < 6 * 24 * 60 * 60 * 1000) {
    localStorage.setItem(EXPIRY_KEY, (Date.now() + SESSION_DURATION).toString());
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const touchTimer = useRef(null);

  // Recupera sessão ao carregar
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
      if (user && !getValidToken()) {
        setUser(null); // token expirou, desloga silenciosamente
      }
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