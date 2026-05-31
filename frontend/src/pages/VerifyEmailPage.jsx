import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Check, X, RefreshCw } from 'lucide-react';
import api from '../services/api';

export default function VerifyEmailPage() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const [status, setStatus]   = useState('loading'); // loading | success | expired | error
  const [message, setMessage] = useState('');
  const [email, setEmail]     = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent]   = useState(false);

  useEffect(() => {
    api.get(`/auth/verify/${token}`)
      .then(r => {
        setStatus('success');
        setMessage(r.data.message);
        setTimeout(() => navigate('/dashboard'), 2500);
      })
      .catch(e => {
        const data = e.response?.data;
        if (data?.expired) {
          setStatus('expired');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data?.message || 'Link inválido ou já utilizado.');
        }
      });
  }, [token, navigate]);

  const handleResend = async () => {
    if (!email.trim()) return;
    setResending(true);
    try {
      await api.post('/auth/forgot-verify', { email });
      setResent(true);
    } catch {
      // tenta mesmo assim — a API retorna sucesso genérico
      setResent(true);
    } finally { setResending(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-3xl border border-white/8 p-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-10">
            <Sparkles size={18} className="text-blue-400" />
            <span className="font-bold text-white tracking-tight">
              Flash<span className="text-blue-400">Mind</span>
            </span>
          </div>

          {/* Loading */}
          {status === 'loading' && (
            <>
              <Loader2 size={36} className="animate-spin text-blue-400 mx-auto mb-5" />
              <p className="text-slate-400 text-sm">Verificando seu e-mail...</p>
            </>
          )}

          {/* Sucesso */}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                <Check size={30} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">E-mail confirmado!</h2>
              <p className="text-slate-500 text-sm mb-2">{message}</p>
              <p className="text-slate-600 text-xs mb-6">Redirecionando...</p>
              <div className="flex items-center justify-center gap-1.5">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </>
          )}

          {/* Expirado */}
          {status === 'expired' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
                <RefreshCw size={28} className="text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Link expirado</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">{message}</p>
              {!resent ? (
                <Link to="/verify-pending"
                  className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)]">
                  Ir para reenviar e-mail
                </Link>
              ) : (
                <p className="text-emerald-400 text-sm flex items-center justify-center gap-2">
                  <Check size={15} /> Novo e-mail enviado!
                </p>
              )}
            </>
          )}

          {/* Erro / já utilizado */}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
                <X size={30} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Link inválido</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">{message}</p>
              <div className="space-y-3">
                <Link to="/verify-pending"
                  className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)]">
                  Reenviar e-mail de confirmação
                </Link>
                <Link to="/login"
                  className="inline-flex items-center justify-center w-full border border-white/8 hover:border-white/15 text-slate-400 hover:text-white py-3 rounded-xl text-sm transition-all bg-white/2">
                  Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}