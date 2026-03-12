import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, ArrowLeft, Eye, EyeOff, Sparkles, CheckCircle2 } from 'lucide-react';

// Tela de redirecionamento exibida após login bem-sucedido
function RedirectScreen({ name }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 animate-redirect-in" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="flex flex-col items-center gap-5 relative z-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-bold text-xl">Bem-vindo de volta{name ? `, ${name.split(' ')[0]}` : ''}! 👋</p>
          <p className="text-slate-500 text-sm mt-1">Redirecionando para o dashboard...</p>
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

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [shake, setShake]       = useState(false);
  const [userName, setUserName] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  // Erro só some quando o usuário tenta submeter de novo — não some sozinho

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      setUserName(res?.user?.name || '');
      setRedirecting(true);
      // Aguarda 1.8s mostrando a tela de redirecionamento, depois navega
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      const msg = err.response?.data?.message || 'Email ou senha incorretos.';
      setError(msg);
      triggerShake();
      setLoading(false);
    }
  };

  if (redirecting) return <RedirectScreen name={userName} />;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />

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

          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Bem-vindo de volta</h1>
          <p className="text-slate-500 text-sm mb-8">Entre para continuar seus estudos.</p>

          {/* Erro com fade-in e permanente até digitar */}
          {error && (
            <div className="animate-fade-in-down bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email" required autoComplete="email" placeholder="voce@email.com"
                className={`w-full bg-white/4 border px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm ${
                  error ? 'border-red-500/30 focus:border-red-500/50' : 'border-white/8 hover:border-white/12 focus:border-blue-500/50'
                }`}
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Senha</label>
                <button type="button" className="text-xs text-blue-500 hover:text-blue-400 transition-colors">
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required autoComplete="current-password" placeholder="••••••••"
                  className={`w-full bg-white/4 border px-4 py-3 pr-11 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm ${
                    error ? 'border-red-500/30 focus:border-red-500/50' : 'border-white/8 hover:border-white/12 focus:border-blue-500/50'
                  }`}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 mt-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verificando...</>
                : <><LogIn size={17} /> Entrar</>
              }
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            Não tem conta?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Criar agora</Link>
          </p>
        </div>
      </div>
    </div>
  );
}