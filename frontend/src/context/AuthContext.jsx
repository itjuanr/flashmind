import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // O estado loading evita que a tela pisque o redirecionamento de login ao dar F5
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('fm_token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Anexa o token para todas as futuras requisições automaticamente
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      try {
        const { data } = await userRequest(); // Valida se o token ainda é real no BD
        setUser(data);
      } catch (error) {
        console.error('Sessão expirada ou inválida:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('fm_token'); // Limpa sujeira antiga
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const userRequest = () => api.get('/auth/me');

  const login = (userData, token) => {
    localStorage.setItem('token', token); // Mantém o usuário logado ao sair do site
    localStorage.removeItem('fm_token'); // Destrói o token antigo que causava o bug
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('fm_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const updateUser = (data) => {
    setUser((prev) => ({ ...prev, ...data }));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
