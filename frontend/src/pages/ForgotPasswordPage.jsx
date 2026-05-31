import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, ArrowLeft, Mail, Check } from 'lucide-react';
import api from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim()) { setError('Informe seu e-mail.'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao enviar e-mail.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar ao login
        </Link>

        <div className="glass rounded-3xl border border-white/8 p-10">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles size={18} className="text-blue-400" />
            <span className="font-bold text-white tracking-tight">Flash<span className="text-blue-400">Mind</span></span>
          </div>

          {!sent ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Esqueceu a senha?</h1>
              <p className="text-slate-500 text-sm mb-8">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    E-mail
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="voce@email.com" autoFocus
                    className={`w-full bg-white/4 border px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm ${
                      error ? 'border-red-500/30 focus:border-red-500/50' : 'border-white/8 hover:border-white/12 focus:border-blue-500/50'
                    }`} />
                  {error && (
                    <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                      ⚠ {error}
                    </p>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 mt-2">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
                    : <><Mail size={16} /> Enviar link de redefinição</>
                  }
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
                <Check size={28} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">E-mail enviado!</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Se <span className="text-slate-300 font-medium">{email}</span> estiver cadastrado,
                você receberá um link de redefinição em breve.
              </p>
              <p className="text-slate-600 text-xs mt-3">
                Verifique também a caixa de spam.
              </p>
              <Link to="/login"
                className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors mt-6">
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}