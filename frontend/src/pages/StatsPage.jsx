import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useTheme } from '../context/ThemeContext';
import { Loader2, TrendingUp, BookOpen, Target, Flame, BarChart2, ChevronLeft, Trash2, AlertTriangle, Check } from 'lucide-react';

const PERIODS = [
  { label: '7 dias',  value: 7  },
  { label: '14 dias', value: 14 },
  { label: '30 dias', value: 30 },
];

const RESET_PERIODS = [
  { label: 'Hoje',       value: 'today'  },
  { label: 'Últimos 7 dias',  value: '7'      },
  { label: 'Últimos 30 dias', value: '30'     },
  { label: 'Tudo',       value: 'all'    },
];

const RESET_TYPES = [
  { label: 'Histórico completo', desc: 'Apaga todas as sessões de estudo e estatísticas', value: 'all' },
  { label: 'Só taxa de acerto',  desc: 'Zera acertos/erros mas mantém o histórico de sessões', value: 'accuracy' },
];

function StatCard({ icon: Icon, label, value, color, sub }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${isDark ? 'glass border-white/8' : 'bg-white/70 border-black/8 shadow-sm'}`}>
      <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/4'}`} style={{ color }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold" style={{ color }}>{value ?? '—'}</p>
        <p className="text-slate-500 text-xs mt-0.5">{label}</p>
        {sub && <p className="text-slate-600 text-[10px] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs shadow-lg ${isDark ? 'bg-[#0F0F18] border-white/10 text-white' : 'bg-white border-black/8 text-slate-800'}`}>
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ─── Modal de Reset ───────────────────────────────────────────────────────────
function ResetModal({ onClose, onReset, isDark }) {
  const [type, setType]     = useState('all');
  const [period, setPeriod] = useState('all');
  const [step, setStep]     = useState('choose'); // choose | confirm | done
  const [loading, setLoading] = useState(false);

  const selectedType   = RESET_TYPES.find((t) => t.value === type);
  const selectedPeriod = RESET_PERIODS.find((p) => p.value === period);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await api.delete('/study/reset', { data: { type, period } });
      setStep('done');
      onReset();
    } catch {
      // silencia
    } finally {
      setLoading(false);
    }
  };

  const surface = isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl ${surface} overflow-hidden`}>

        {/* Header */}
        <div className={`px-6 py-5 border-b ${isDark ? 'border-white/8' : 'border-black/6'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <Trash2 size={16} className="text-red-400" />
            </div>
            <div>
              <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>Resetar estatísticas</h2>
              <p className="text-slate-500 text-xs mt-0.5">Escolha o que e qual período apagar</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">

          {step === 'choose' && (
            <>
              {/* O que resetar */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>O que resetar</p>
                <div className="space-y-2">
                  {RESET_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => setType(t.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        type === t.value
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : isDark ? 'border-white/8 hover:border-white/15 text-slate-400' : 'border-black/8 hover:border-black/15 text-slate-600'
                      }`}>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className={`text-xs mt-0.5 ${type === t.value ? 'text-red-400/70' : 'text-slate-500'}`}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Período */}
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Período</p>
                <div className="grid grid-cols-2 gap-2">
                  {RESET_PERIODS.map((p) => (
                    <button key={p.value} type="button" onClick={() => setPeriod(p.value)}
                      className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                        period === p.value
                          ? 'bg-red-500/10 border-red-500/30 text-red-400'
                          : isDark ? 'border-white/8 hover:border-white/15 text-slate-400' : 'border-black/8 hover:border-black/15 text-slate-600'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={onClose}
                  className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-all ${isDark ? 'border-white/8 text-slate-400 hover:bg-white/5' : 'border-black/8 text-slate-500 hover:bg-black/4'}`}>
                  Cancelar
                </button>
                <button onClick={() => setStep('confirm')}
                  className="flex-1 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 font-semibold text-sm transition-all">
                  Continuar
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <div className="text-center">
              <div className="p-4 rounded-2xl bg-amber-500/10 w-fit mx-auto mb-4">
                <AlertTriangle size={28} className="text-amber-400" />
              </div>
              <p className={`font-bold text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Tem certeza?</p>
              <p className="text-slate-500 text-sm mb-1">
                Você vai resetar: <span className="text-red-400 font-medium">{selectedType?.label}</span>
              </p>
              <p className="text-slate-500 text-sm mb-6">
                Período: <span className="text-red-400 font-medium">{selectedPeriod?.label}</span>
              </p>
              <p className="text-slate-600 text-xs mb-6">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setStep('choose')}
                  className={`flex-1 py-3 rounded-xl border font-semibold text-sm transition-all ${isDark ? 'border-white/8 text-slate-400 hover:bg-white/5' : 'border-black/8 text-slate-500 hover:bg-black/4'}`}>
                  Voltar
                </button>
                <button onClick={handleConfirm} disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  Resetar
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 w-fit mx-auto mb-4">
                <Check size={28} className="text-emerald-400" />
              </div>
              <p className={`font-bold text-base mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Resetado com sucesso!</p>
              <p className="text-slate-500 text-sm mb-6">Suas estatísticas foram atualizadas.</p>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all">
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StatsPage ────────────────────────────────────────────────────────────────
export default function StatsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [period, setPeriod]       = useState(14);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showReset, setShowReset] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/study/history?days=${period}`)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [period]);

  const today = new Date().toISOString().slice(0, 10);
  const fmtDate = (iso) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

  const chartData = (data?.daily || []).map((d) => ({
    ...d,
    label: fmtDate(d.date),
    wrong: d.cards - d.correct,
    isToday: d.date === today,
  }));

  const hasAnyStudy = chartData.some((d) => d.cards > 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <Navbar />

      {showReset && <ResetModal isDark={isDark} onClose={() => setShowReset(false)} onReset={load} />}

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-16 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 text-sm mb-3 transition-colors">
              <ChevronLeft size={15} /> Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <BarChart2 size={28} className="text-blue-400" /> Estatísticas
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Seletor de período */}
            <div className={`flex rounded-xl border overflow-hidden ${isDark ? 'border-white/8' : 'border-black/8'}`}>
              {PERIODS.map((p) => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={`px-4 py-2 text-sm font-medium transition-all ${
                    period === p.value
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-500 hover:bg-black/4'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            {/* Botão reset */}
            <button onClick={() => setShowReset(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${isDark ? 'border-white/8 text-slate-500 hover:border-red-500/30 hover:text-red-400' : 'border-black/8 text-slate-400 hover:border-red-500/30 hover:text-red-400'}`}>
              <Trash2 size={14} /> Resetar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-600" /></div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard icon={BookOpen}   label="Cards estudados" value={data?.totalCards}    color="#60a5fa" />
              <StatCard icon={Target}     label="Taxa de acerto"  value={data?.accuracy != null ? `${data.accuracy}%` : null}
                color={data?.accuracy >= 70 ? '#34d399' : data?.accuracy >= 40 ? '#fbbf24' : '#f87171'} />
              <StatCard icon={TrendingUp} label="Sessões totais"  value={data?.totalSessions} color="#a78bfa" />
              <StatCard icon={Flame}      label="Dias seguidos"   value={data?.streak}        color="#fb923c"
                sub={data?.streak > 0 ? '🔥 sequência atual' : 'estude hoje para começar'} />
            </div>

            {/* Gráfico */}
            <div className={`rounded-2xl border p-6 ${isDark ? 'glass border-white/8' : 'bg-white/70 border-black/8 shadow-sm'}`}>
              <h2 className="text-sm font-semibold mb-6" style={{ color: 'var(--text)' }}>Cards estudados por dia</h2>
              {!hasAnyStudy ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-slate-600 text-sm">Nenhuma sessão nos últimos {period} dias.</p>
                  <p className="text-slate-700 text-xs mt-1">Estude um deck para ver seu progresso aqui.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barGap={2}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Bar dataKey="correct" name="Acertos" stackId="a" radius={[0,0,0,0]} fill="#34d399">
                      {chartData.map((d, i) => <Cell key={i} fill={d.isToday ? '#60a5fa' : '#34d399'} fillOpacity={d.cards > 0 ? 1 : 0.15} />)}
                    </Bar>
                    <Bar dataKey="wrong" name="Erros" stackId="a" radius={[4,4,0,0]} fill="#f87171">
                      {chartData.map((d, i) => <Cell key={i} fill={d.isToday ? '#818cf8' : '#f87171'} fillOpacity={d.cards > 0 ? 0.7 : 0.1} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex items-center gap-4 mt-4 justify-end">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block"/> Acertos</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block"/> Erros</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block"/> Hoje</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}