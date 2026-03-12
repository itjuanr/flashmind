import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, ArrowLeft, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';

function RedirectScreen({ name }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-redirect-in" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="flex flex-col items-center gap-5 relative z-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-bold text-xl">Conta criada, {name ? name.split(' ')[0] : 'seja bem-vindo'}! 🎉</p>
          <p className="text-slate-500 text-sm mt-1">Preparando seu dashboard...</p>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  const [form, setForm]         = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [shake, setShake]       = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Erro só some quando o usuário tenta submeter de novo

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      triggerShake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      setRedirecting(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível criar a conta. Tente novamente.');
      triggerShake();
      setLoading(false);
    }
  };

  // Força da senha
  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'][strength];
  const strengthLabel = ['', 'Fraca', 'Média', 'Forte'][strength];

  if (redirecting) return <RedirectScreen name={form.name} />;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar para o início
        </Link>

        <div className={`glass rounded-3xl border border-white/8 p-10 transition-all ${shake ? 'animate-shake border-red-500/30' : ''}`}>
          <div className="flex items-center gap-2 mb-8">
            <Sparkles size={18} className="text-blue-400" />
            <span className="font-bold text-white tracking-tight">Flash<span className="text-blue-400">Mind</span></span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Crie sua conta</h1>
          <p className="text-slate-500 text-sm mb-8">Organize seus estudos com flashcards inteligentes.</p>

          {error && (
            <div className="animate-fade-in-down bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Nome completo</label>
              <input type="text" name="name" required autoComplete="name" placeholder="Seu nome"
                className="w-full bg-white/4 border border-white/8 hover:border-white/12 focus:border-blue-500/50 px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm"
                value={form.name} onChange={handleChange} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Email</label>
              <input type="email" name="email" required autoComplete="email" placeholder="voce@email.com"
                className={`w-full bg-white/4 border px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm ${
                  error ? 'border-red-500/30 focus:border-red-500/50' : 'border-white/8 hover:border-white/12 focus:border-blue-500/50'
                }`}
                value={form.email} onChange={handleChange} />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Senha</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} name="password" required autoComplete="new-password" placeholder="Mínimo 6 caracteres"
                  className={`w-full bg-white/4 border px-4 py-3 pr-11 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm ${
                    error ? 'border-red-500/30 focus:border-red-500/50' : 'border-white/8 hover:border-white/12 focus:border-blue-500/50'
                  }`}
                  value={form.password} onChange={handleChange} />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Barra de força */}
              {form.password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <p className={`text-[11px] mt-1 transition-all ${strengthColor.replace('bg-', 'text-')}`}>{strengthLabel}</p>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Criando conta...</>
                : <><UserPlus size={17} /> Criar minha conta</>
              }
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}