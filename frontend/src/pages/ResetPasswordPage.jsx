import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import api from '../services/api';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate  = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const strengthColor = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'];
  const strengthLevel = password.length === 0 ? -1 : password.length < 6 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;

  const handleSubmit = async e => {
    e.preventDefault();
    if (password.length < 6) { setError('A senha precisa ter ao menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setError(''); setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Link inválido ou expirado.');
    } finally { setLoading(false); }
  };

  const inp = (hasErr) => `w-full bg-white/4 border px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm ${
    hasErr ? 'border-red-500/30 focus:border-red-500/50' : 'border-white/8 hover:border-white/12 focus:border-blue-500/50'
  }`;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {!success && (
          <Link to="/login" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors group">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            Voltar ao login
          </Link>
        )}

        <div className="glass rounded-3xl border border-white/8 p-10">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles size={18} className="text-blue-400" />
            <span className="font-bold text-white tracking-tight">Flash<span className="text-blue-400">Mind</span></span>
          </div>

          {!success ? (
            <>
              <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Nova senha</h1>
              <p className="text-slate-500 text-sm mb-8">Escolha uma nova senha para sua conta.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres" autoFocus
                      className={`${inp(false)} pr-11`} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {[0,1,2,3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strengthLevel ? strengthColor[strengthLevel] : 'bg-white/10'}`} />
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Confirmar senha
                  </label>
                  <input type="password" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={inp(confirm.length > 0 && confirm !== password)} />
                  {confirm.length > 0 && confirm !== password && (
                    <p className="mt-1.5 text-xs text-red-400">⚠ As senhas não coincidem.</p>
                  )}
                  {confirm.length > 0 && confirm === password && password.length >= 6 && (
                    <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                      <Check size={11} /> Senhas coincidem!
                    </p>
                  )}
                </div>

                {error && (
                  <div className="animate-fade-in-down bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 mt-2">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                    : 'Salvar nova senha'
                  }
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-5">
                <Check size={28} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Senha redefinida!</h2>
              <p className="text-slate-500 text-sm">Sua senha foi atualizada com sucesso.</p>
              <p className="text-slate-600 text-xs mt-2">Redirecionando para o login...</p>
              <div className="flex items-center justify-center gap-1.5 mt-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}