import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UserPlus, ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast('Conta criada com sucesso! 🎉', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Nome completo', type: 'text', placeholder: 'Seu nome', autoComplete: 'name' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'voce@email.com', autoComplete: 'email' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors group"
        >
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar para o início
        </Link>

        <div className="glass rounded-3xl border border-white/8 p-10">
          <div className="flex items-center gap-2 mb-8">
            <Sparkles size={18} className="text-blue-400" />
            <span className="font-bold text-white tracking-tight">
              Flash<span className="text-blue-400">Mind</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Crie sua conta</h1>
          <p className="text-slate-500 text-sm mb-8">Comece a usar IA para seus flashcards hoje.</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map(({ name, label, type, placeholder, autoComplete }) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  {label}
                </label>
                <input
                  type={type}
                  name={name}
                  required
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  className="w-full bg-white/4 border border-white/8 hover:border-white/12 focus:border-blue-500/50 px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm"
                  value={form[name]}
                  onChange={handleChange}
                />
              </div>
            ))}

            {/* Senha com toggle */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/4 border border-white/8 hover:border-white/12 focus:border-blue-500/50 px-4 py-3 pr-11 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm"
                  value={form.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Indicador de força da senha */}
              {form.password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-0.5 flex-1 rounded-full transition-all ${
                        form.password.length >= i * 4
                          ? i === 1 ? 'bg-red-500' : i === 2 ? 'bg-amber-500' : 'bg-emerald-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Criando conta...</>
              ) : (
                <>
                  <UserPlus size={17} /> Criar minha conta
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-500 text-sm">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}