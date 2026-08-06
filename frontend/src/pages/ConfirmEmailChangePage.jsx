import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import api from '../services/api';

export default function ConfirmEmailChangePage() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const { theme }  = useTheme();
  const { user, updateUser } = useAuth();
  const isDark     = theme === 'dark';
  const ran        = useRef(false);

  const [status, setStatus]   = useState('loading'); // loading | ok | erro
  const [message, setMessage] = useState('');

  useEffect(() => {
    // StrictMode monta duas vezes em dev; sem esta trava o token seria
    // consumido na primeira chamada e a segunda mostraria "link inválido".
    if (ran.current) return;
    ran.current = true;

    api.get(`/auth/confirm-email-change/${token}`)
      .then((r) => {
        setStatus('ok');
        setMessage(r.data.message);
        if (user) updateUser({ email: r.data.email, pendingEmail: null, isVerified: true });
      })
      .catch((err) => {
        setStatus('erro');
        setMessage(err.response?.data?.message || 'Não foi possível confirmar a troca.');
      });
  }, [token, user, updateUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"
      style={{ backgroundColor: 'var(--bg)' }}>
      {status === 'loading' && (
        <>
          <Loader2 size={30} className="animate-spin text-slate-600" />
          <p className="text-slate-500 text-sm">Confirmando seu novo e-mail...</p>
        </>
      )}

      {status === 'ok' && (
        <>
          <CheckCircle2 size={44} className="text-emerald-400" />
          <h1 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>E-mail alterado!</h1>
          <p className="text-slate-500 text-sm max-w-sm">{message}</p>
          <button onClick={() => navigate(user ? '/profile' : '/login')}
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm">
            {user ? 'Voltar ao perfil' : 'Fazer login'}
          </button>
        </>
      )}

      {status === 'erro' && (
        <>
          <XCircle size={44} className="text-red-400" />
          <h1 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Não deu certo</h1>
          <p className="text-slate-500 text-sm max-w-sm">{message}</p>
          <button onClick={() => navigate(user ? '/profile' : '/')}
            className="mt-4 text-blue-400 text-sm hover:underline">
            {user ? 'Tentar novamente no perfil' : 'Ir para o início'}
          </button>
        </>
      )}
    </div>
  );
}
