import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Loader2, Check, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function VerifyPendingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');
  const [checked, setChecked]   = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResend = async () => {
    setSending(true); setError(''); setSent(false);
    try {
      await api.post('/auth/resend-verification');
      setSent(true);
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao reenviar. Tente novamente.');
    } finally { setSending(false); }
  };

  // Verifica se o usuário já confirmou o e-mail (para quando ele voltar à aba)
  const handleCheck = async () => {
    setChecking(true); setError('');
    try {
      const res = await api.get('/auth/me');
      if (res.data.isVerified) {
        // Recarrega a página para atualizar o AuthContext
        window.location.href = '/dashboard';
      } else {
        setChecked(true);
        setTimeout(() => setChecked(false), 3000);
      }
    } catch {
      setError('Erro ao verificar. Tente novamente.');
    } finally { setChecking(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="glass rounded-3xl border border-white/8 p-10 text-center">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-10">
            <Sparkles size={18} className="text-blue-400" />
            <span className="font-bold text-white tracking-tight">
              Flash<span className="text-blue-400">Mind</span>
            </span>
          </div>

          {/* Ícone */}
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Mail size={30} className="text-blue-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Confirme seu e-mail
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-2">
            Enviamos um link de confirmação para
          </p>
          <p className="text-blue-400 font-medium text-sm mb-6">
            {user?.email}
          </p>
          <p className="text-slate-600 text-xs leading-relaxed mb-8">
            Clique no link do e-mail para ativar sua conta.<br />
            Verifique também a caixa de spam.
          </p>

          {/* Feedback */}
          {sent && (
            <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 rounded-xl mb-4">
              <Check size={15} /> E-mail reenviado com sucesso!
            </div>
          )}
          {checked && (
            <div className="flex items-center justify-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm px-4 py-3 rounded-xl mb-4">
              E-mail ainda não confirmado. Verifique sua caixa de entrada.
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* Ações */}
          <div className="space-y-3">
            {/* Verificar se já confirmou */}
            <button onClick={handleCheck} disabled={checking}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 text-sm">
              {checking
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verificando...</>
                : <><RefreshCw size={16} /> Já confirmei, entrar</>
              }
            </button>

            {/* Reenviar */}
            <button onClick={handleResend} disabled={sending}
              className="w-full border border-white/8 hover:border-white/15 text-slate-400 hover:text-white bg-white/2 hover:bg-white/5 font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
              {sending
                ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                : <><Mail size={15} /> Reenviar e-mail</>
              }
            </button>

            {/* Sair */}
            <button onClick={handleLogout}
              className="w-full text-slate-600 hover:text-slate-400 text-sm flex items-center justify-center gap-1.5 py-2 transition-colors">
              <LogOut size={14} /> Usar outra conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}