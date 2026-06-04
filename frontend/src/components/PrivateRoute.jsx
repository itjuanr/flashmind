import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children, requireVerified = true }) {
  const { user, loading } = useAuth();

  // 1. Aguarda o AuthContext validar o token com o Backend
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  // 2. Se terminar de carregar e não tiver usuário, vai pro Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Se a rota EXIGE verificação e o usuário NÃO é verificado -> vai para pending
  if (requireVerified && !user.isVerified) {
    return <Navigate to="/verify-pending" replace />;
  }

  // 4. Se a rota NÃO exige verificação (ex: tela pending) mas o usuário JÁ É verificado -> Dashboard nela!
  if (!requireVerified && user.isVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se passou por todas as barreiras, renderiza o componente filho
  return children;
}