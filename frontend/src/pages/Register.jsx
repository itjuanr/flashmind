import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Eye, EyeOff, Loader2, ArrowLeft, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import api from '../services/api';

const STUDY_GOALS = [
  { value: 'concurso',     label: '🏛️ Concurso público'    },
  { value: 'faculdade',    label: '🎓 Faculdade/Vestibular'  },
  { value: 'idioma',       label: '🌍 Aprender idioma'       },
  { value: 'certificacao', label: '📜 Certificação'          },
  { value: 'curiosidade',  label: '🔍 Curiosidade geral'     },
  { value: 'outro',        label: '✏️ Outro'                 },
];

const STUDY_AREAS = [
  { value: 'exatas',     label: '🔢 Exatas'      },
  { value: 'humanas',    label: '📚 Humanas'     },
  { value: 'saude',      label: '🩺 Saúde'       },
  { value: 'tecnologia', label: '💻 Tecnologia'  },
  { value: 'linguas',    label: '🌐 Línguas'     },
  { value: 'outro',      label: '🎯 Outro'       },
];

const HOW_FOUND = [
  { value: 'instagram', label: '📸 Instagram'  },
  { value: 'linkedin',  label: '💼 LinkedIn'   },
  { value: 'amigo',     label: '👥 Indicação'  },
  { value: 'google',    label: '🔍 Google'     },
  { value: 'outro',     label: '✨ Outro'      },
];

function OptionGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium text-left transition-all ${
            value === opt.value
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
              : 'border-white/8 bg-white/2 text-slate-400 hover:border-white/15 hover:text-slate-200'
          }`}>
          {value === opt.value
            ? <Check size={13} className="flex-shrink-0 text-blue-400" />
            : <span className="w-3 flex-shrink-0" />
          }
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Register() {
  const { login }    = useAuth();
  const navigate     = useNavigate();

  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showPw, setShowPw] = useState(false);

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [studyGoal, setStudyGoal] = useState('');
  const [studyArea, setStudyArea] = useState('');
  const [howFound, setHowFound]   = useState('');

  const validateStep1 = () => {
    if (!name.trim())                    return 'Informe seu nome.';
    if (!email.trim())                   return 'Informe seu e-mail.';
    if (!/\S+@\S+\.\S+/.test(email))    return 'E-mail inválido.';
    
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passRegex.test(password)) {
      return 'Senha fraca. Utilize pelo menos 8 caracteres misturando maiúsculas, minúsculas, números e símbolos.';
    }
    
    return '';
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      // Registra o usuário e inicializa a sessão via AuthContext imediatamente
      const res = await api.post('/auth/register', { name, email, password, studyGoal, studyArea, howFound });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao criar conta.');
    } finally { setLoading(false); }
  };

  const inp = `w-full bg-white/4 border border-white/8 hover:border-white/12 focus:border-blue-500/50 px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm`;

  const strengthColor = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'];
  
  // Algoritmo dinâmico para a força da senha baseado em critérios reais
  const calculateStrength = (pwd) => {
    if (!pwd) return -1;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score - 1; // Mapeia de 1~4 para índices de array (0~3)
  };
  const strengthLevel = calculateStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/3 w-[500px] h-[500px] bg-blue-600/8 blur-[140px] rounded-full pointer-events-none" />

      {/* Alargando o Form (de max-w-md para max-w-[520px]) para os botões do Step 2 encaixarem perfeitamente */}
      <div className="w-full max-w-[520px] relative z-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Voltar para o início
        </Link>

        {/* Progresso */}
        <div className="flex gap-1.5 mb-6">
          {[1,2,3].map(n => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
          ))}
        </div>

        <div className="glass rounded-3xl border border-white/8 p-10">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-8">
            <img src="https://i.imgur.com/jXDsNEh.png" alt="FlashMind Logo" className="w-12 h-12 object-contain" />
            <span className="font-bold text-white tracking-tight">Flash<span className="text-blue-400">Mind</span></span>
          </div>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Criar conta</h1>
              <p className="text-slate-500 text-sm mb-8">Passo 1 de 3 — Dados de acesso</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Nome completo</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"
                    className={inp} autoFocus onKeyDown={e => e.key === 'Enter' && handleNext()} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com"
                    className={inp} onKeyDown={e => e.key === 'Enter' && handleNext()} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Senha</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Maiúsculas, números e símbolos"
                      className={`${inp} pr-11`} onKeyDown={e => e.key === 'Enter' && handleNext()} />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Força da senha */}
                  {password.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {[0,1,2,3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strengthLevel ? strengthColor[strengthLevel] : 'bg-white/10'}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Seu perfil</h1>
              <p className="text-slate-500 text-sm mb-8">Passo 2 de 3 — Personalize sua experiência</p>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    Objetivo de estudo
                  </label>
                  <OptionGrid options={STUDY_GOALS} value={studyGoal} onChange={setStudyGoal} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    Área de interesse
                  </label>
                  <OptionGrid options={STUDY_AREAS} value={studyArea} onChange={setStudyArea} />
                </div>
              </div>
            </>
          )}

          {/* ── Step 3 ── */}
          {step === 3 && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Quase lá!</h1>
              <p className="text-slate-500 text-sm mb-8">Passo 3 de 3 — Como nos encontrou?</p>
              <OptionGrid options={HOW_FOUND} value={howFound} onChange={setHowFound} />
            </>
          )}

          {/* Erro */}
          {error && (
            <div className="mt-4 animate-fade-in-down bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Botões */}
          <div className={`flex gap-3 mt-8 ${step > 1 ? '' : ''}`}>
            {step > 1 && (
              <button onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/8 text-slate-400 hover:border-white/15 hover:text-slate-200 text-sm font-semibold transition-all">
                <ChevronLeft size={15} />
              </button>
            )}
            {step < 3 ? (
              <button onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                Continuar <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Criando conta...</>
                  : <><Check size={15} /> Criar conta grátis</>
                }
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-slate-500 text-sm">
          Já tem conta?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Entrar</Link>
        </p>
      </div>
    </div>
  );
}