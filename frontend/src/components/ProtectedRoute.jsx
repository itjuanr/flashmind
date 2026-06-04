import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  // Enquanto o AuthContext verifica o token no localStorage e na API, 
  // bloqueamos a renderização da rota e mostramos um loading suave.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  // Se o carregamento terminou e não há usuário, redireciona para o login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se o usuário estiver logado, renderiza as rotas filhas normalmente.
  return <Outlet />;
}