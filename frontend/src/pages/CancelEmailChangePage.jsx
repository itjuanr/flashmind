import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ShieldCheck, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function CancelEmailChangePage() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const ran       = useRef(false);

  const [status, setStatus]   = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // StrictMode monta duas vezes em dev; sem a trava, a segunda chamada
    // encontraria a solicitação já cancelada e mostraria erro.
    if (ran.current) return;
    ran.current = true;

    api.get(`/auth/cancel-email-change/${token}`)
      .then((r) => { setStatus('ok'); setMessage(r.data.message); })
      .catch((err) => {
        setStatus('erro');
        setMessage(err.response?.data?.message || 'Não foi possível cancelar.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center"
      style={{ backgroundColor: 'var(--bg)' }}>
      {status === 'loading' && (
        <>
          <Loader2 size={30} className="animate-spin text-slate-600" />
          <p className="text-slate-500 text-sm">Cancelando a solicitação...</p>
        </>
      )}

      {status === 'ok' && (
        <>
          <ShieldCheck size={44} className="text-emerald-400" />
          <h1 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Solicitação cancelada</h1>
          <p className="text-slate-500 text-sm max-w-sm leading-relaxed">{message}</p>
          <div className="mt-4 max-w-sm rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3">
            <p className="text-xs text-amber-400/90 leading-relaxed">
              Se você não reconhece esta solicitação, troque sua senha agora — pode ser que alguém tenha
              acesso à sua conta.
            </p>
          </div>
          <button onClick={() => navigate('/login')}
            className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm">
            Entrar na minha conta
          </button>
        </>
      )}

      {status === 'erro' && (
        <>
          <XCircle size={44} className="text-red-400" />
          <h1 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Nada para cancelar</h1>
          <p className="text-slate-500 text-sm max-w-sm">{message}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-blue-400 text-sm hover:underline">
            Ir para o início
          </button>
        </>
      )}
    </div>
  );
}
