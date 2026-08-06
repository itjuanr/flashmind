import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import { Loader2, Trophy, Flame, Target, Layers } from 'lucide-react';
import api from '../services/api';

const medalha = (pos) => (pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null);

function Linha({ l, souEu, isDark }) {
  const m = medalha(l.posicao);
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 sm:gap-4 transition-all ${
      souEu
        ? 'border-blue-500/40 bg-blue-500/10'
        : isDark ? 'bg-white/2 border-white/8' : 'bg-white border-black/8 shadow-sm'
    }`}>
      <div className="w-9 flex-shrink-0 text-center">
        {m ? <span className="text-xl">{m}</span>
           : <span className="text-sm font-bold text-slate-500">{l.posicao}</span>}
      </div>

      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
          {l.nome}{souEu && <span className="text-blue-400 font-normal"> · você</span>}
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
            <Layers size={11} /> {l.cards}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
            <Target size={11} /> {l.precisao}%
          </span>
          {l.ofensiva > 0 && (
            <span className="text-xs text-amber-400 flex items-center gap-1 whitespace-nowrap">
              <Flame size={11} /> {l.ofensiva}d
            </span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{l.pontos}</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">pontos</p>
      </div>
    </div>
  );
}

export default function RankingPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const toast = useToast();

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/ranking')
      .then((r) => setDados(r.data))
      .catch(() => toast('Erro ao carregar o ranking.', 'error'))
      .finally(() => setCarregando(false));
  }, [toast]);

  const foraDoTop = dados?.eu && !dados.top.some((l) => l.userId === dados.eu.userId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-28 pb-16 relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={22} className="text-amber-400 flex-shrink-0" />
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Ranking
          </h1>
        </div>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Pontos vêm dos cards revisados, multiplicados pela sua precisão, mais 20 por dia de ofensiva.
          Contando os últimos 12 meses.
        </p>

        {carregando ? (
          <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-slate-600" /></div>
        ) : !dados || dados.top.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
              <Trophy size={32} className="text-slate-500" />
            </div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Ninguém no placar ainda
            </h3>
            <p className="text-slate-500 text-sm">Estude um deck para aparecer aqui.</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {dados.top.map((l) => (
                <Linha key={l.userId} l={l} souEu={l.userId === user?.id} isDark={isDark} />
              ))}
            </div>

            {/* Fora do top 50, a posição própria aparece destacada no rodapé */}
            {foraDoTop && (
              <>
                <p className="text-center text-slate-600 text-xs my-4">· · ·</p>
                <Linha l={dados.eu} souEu isDark={isDark} />
              </>
            )}

            <p className="text-center text-slate-600 text-xs mt-6">
              {dados.totalParticipantes} participante{dados.totalParticipantes !== 1 ? 's' : ''}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
