import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  // 1. Aguarda o AuthContext (Evita que o usuário pisque na Home antes de ir pro Dashboard)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }

  // 2. Se o usuário já está logado, ele não deve ver rotas públicas (Home, Login, etc)
  if (user) {
    return <Navigate to={user.isVerified ? "/dashboard" : "/verify-pending"} replace />;
  }

  return children;
}