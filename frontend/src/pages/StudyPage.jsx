import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { ZoomableImage } from '../components/ImageZoom';
import {
  ArrowLeft, RotateCcw, CheckCircle2, XCircle, X,
  RefreshCw, LayoutDashboard, Loader2, BookOpen,
  Star, Shuffle, AlignLeft, Timer, TimerOff, Maximize2, Minimize2,
  Pencil, Volume2, CheckSquare, Square, ListChecks,
} from 'lucide-react';

// ─── Botão de áudio para o StudyPage ─────────────────────────────────────────
function AudioPlayBtn({ src, side, onClick }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  if (!src) return null;

  const toggle = (e) => {
    if (onClick) onClick(e);
    // Se já está tocando, para
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }
    const a = new Audio(src);
    audioRef.current = a;
    a.onended = () => setPlaying(false);
    a.onerror = () => setPlaying(false);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const cls = side === 'front'
    ? 'text-slate-500 hover:text-white hover:bg-white/10'
    : 'text-blue-400/60 hover:text-blue-300 hover:bg-blue-500/10';
  return (
    <button onClick={toggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${cls} ${playing ? 'animate-pulse' : ''}`}>
      <Volume2 size={13} /> {playing ? 'Tocando...' : 'Ouvir'}
    </button>
  );
}

const SCALE = [
  { score: 1, label: 'Não sabia',     color: 'text-red-500',     rawColor: '#ef4444', bg: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20',         days: 1  },
  { score: 2, label: 'Errei',         color: 'text-orange-400',  rawColor: '#fb923c', bg: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20', days: 1  },
  { score: 3, label: 'Mais ou menos', color: 'text-amber-400',   rawColor: '#fbbf24', bg: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20',    days: 3  },
  { score: 4, label: 'Acertei',       color: 'text-emerald-400', rawColor: '#34d399', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20', days: 7  },
  { score: 5, label: 'Dominei!',      color: 'text-blue-400',    rawColor: '#60a5fa', bg: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',       days: 14 },
];

const TIMER_OPTIONS = [0, 15, 30, 60]; // 0 = desativado

// ─── Tela de Resultado ─────────────────────────────────────────────────────────
function ResultScreen({ total, scores, wrongCards = [], onRestart, onRetryWrong, onBack }) {
  const dominated = scores.filter((s) => s === 5).length;
  const correct   = scores.filter((s) => s === 4).length;
  const medium    = scores.filter((s) => s === 3).length;
  const wrong     = scores.filter((s) => s === 2).length;
  const noIdea    = scores.filter((s) => s === 1).length;
  const goodCount = scores.filter((s) => s >= 3).length;
  const pct = Math.round((goodCount / total) * 100);

  const { emoji, title, subtitle } =
    pct === 100 ? { emoji: '🏆', title: 'Perfeito!',            subtitle: 'Você acertou tudo. Incrível!' } :
    pct >= 70   ? { emoji: '🎯', title: 'Muito bem!',           subtitle: 'Você está dominando o conteúdo.' } :
    pct >= 40   ? { emoji: '📚', title: 'Bom esforço!',         subtitle: 'Ainda há espaço para melhorar.' } :
                  { emoji: '💪', title: 'Continue praticando!', subtitle: 'Revise o conteúdo e tente novamente.' };

  const breakdown = [
    { label: 'Dominei',       count: dominated, color: 'text-blue-400',    dot: 'bg-blue-400'    },
    { label: 'Acertei',       count: correct,   color: 'text-emerald-400', dot: 'bg-emerald-400' },
    { label: 'Mais ou menos', count: medium,    color: 'text-amber-400',   dot: 'bg-amber-400'   },
    { label: 'Errei',         count: wrong,     color: 'text-orange-400',  dot: 'bg-orange-400'  },
    { label: 'Não sabia',     count: noIdea,    color: 'text-red-400',     dot: 'bg-red-400'     },
  ].filter((b) => b.count > 0);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/6 blur-[140px] rounded-full pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-6xl mb-6">{emoji}</div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{title}</h1>
        <p className="text-slate-500 mb-10">{subtitle}</p>
        <div className="glass rounded-2xl border border-white/8 p-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{pct}%</p>
              <p className="text-slate-500 text-xs mt-0.5">aproveitamento</p>
            </div>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 mb-6">
            <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <div className="space-y-2">
            {breakdown.map(({ label, count, color, dot }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-slate-400 text-sm">{label}</span>
                </div>
                <span className={`font-semibold text-sm ${color}`}>{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          {wrongCards.length > 0 && (
            <button onClick={onRetryWrong}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 font-semibold py-3.5 rounded-xl transition-all text-sm">
              <RotateCcw size={16} /> Revisar {wrongCards.length} erro{wrongCards.length > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all text-sm">
            <RefreshCw size={16} /> Repetir
          </button>
          <button onClick={onBack}
            className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 text-slate-300 font-semibold py-3.5 rounded-xl transition-all text-sm">
            <LayoutDashboard size={16} /> Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tela de configuração da sessão ───────────────────────────────────────────
function SetupScreen({ deckName, allCards, onStart, onBack, isDark }) {
  const cardCount = allCards.length;
  const [shuffled, setShuffled]   = useState(true);
  const [timerSec, setTimerSec]   = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected]   = useState(new Set(allCards.map((c) => c._id)));

  const toggleCard = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected(selected.size === allCards.length ? new Set() : new Set(allCards.map((c) => c._id)));
  };

  const chosenCards = allCards.filter((c) => selected.has(c._id));

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm transition-colors group mb-6 mx-auto">
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar
          </button>
          <div className="text-4xl mb-3">🧠</div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{deckName}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {selected.size === cardCount ? `${cardCount} cards` : `${selected.size} de ${cardCount} selecionados`}
          </p>
        </div>

        {/* Modo seleção de cards */}
        {selectMode ? (
          <div className={`rounded-2xl border mb-4 overflow-hidden ${isDark ? 'glass border-white/8' : 'bg-white/80 border-black/8 shadow-sm'}`}>
            {/* Header da lista */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/8' : 'border-black/6'}`}>
              <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Selecionar cards
              </span>
              <button onClick={toggleAll} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                {selected.size === allCards.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
            </div>
            {/* Lista de cards */}
            <div className="max-h-64 overflow-y-auto">
              {allCards.map((c) => {
                const isSelected = selected.has(c._id);
                return (
                  <button key={c._id} onClick={() => toggleCard(c._id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all border-b last:border-0 ${
                      isDark ? 'border-white/5 hover:bg-white/5' : 'border-black/4 hover:bg-black/3'
                    } ${isSelected ? '' : 'opacity-40'}`}>
                    <div className={`mt-0.5 flex-shrink-0 transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-600'}`}>
                      {isSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{c.front}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{c.back}</p>
                      {/* Badges de mídia */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {(c.frontImage || c.backImage) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium">🖼 imagem</span>
                        )}
                        {(c.frontAudio || c.backAudio) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">🔊 áudio</span>
                        )}
                        {c.notes && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">📝 nota</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl border p-5 space-y-4 mb-4 ${isDark ? 'glass border-white/8' : 'bg-white/80 border-black/8 shadow-sm'}`}>
            {/* Ordem */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shuffle size={15} className={shuffled ? 'text-blue-400' : 'text-slate-500'} />
                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Embaralhar cards</span>
              </div>
              <button type="button" onClick={() => setShuffled((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-all ${shuffled ? 'bg-blue-600' : isDark ? 'bg-white/10' : 'bg-black/15'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${shuffled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            {/* Modo foco */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Maximize2 size={15} className={focusMode ? 'text-purple-400' : 'text-slate-500'} />
                <div>
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Modo foco</span>
                  <p className="text-slate-500 text-xs">Esconde a Navbar durante o estudo</p>
                </div>
              </div>
              <button type="button" onClick={() => setFocusMode((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-all ${focusMode ? 'bg-purple-600' : isDark ? 'bg-white/10' : 'bg-black/15'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${focusMode ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
            {/* Timer */}
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <Timer size={15} className={timerSec > 0 ? 'text-amber-400' : 'text-slate-500'} />
                <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Timer por card</span>
              </div>
              <div className="flex gap-2">
                {TIMER_OPTIONS.map((t) => (
                  <button key={t} type="button" onClick={() => setTimerSec(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      timerSec === t
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : isDark ? 'border-white/8 text-slate-500 hover:border-white/15' : 'border-black/8 text-slate-500 hover:border-black/15'
                    }`}>
                    {t === 0 ? 'Off' : `${t}s`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Botão escolher cards */}
        <button onClick={() => setSelectMode((v) => !v)}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all mb-3 ${
            selectMode
              ? isDark ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
              : isDark ? 'border-white/8 text-slate-400 hover:border-white/15 hover:text-white' : 'border-black/8 text-slate-500 hover:border-black/15'
          }`}>
          <ListChecks size={15} />
          {selectMode ? `Configurar sessão` : `Escolher cards (${selected.size}/${cardCount})`}
        </button>

        <button
          disabled={selected.size === 0}
          onClick={() => onStart({ shuffled, timerSec, focusMode, selectedCards: chosenCards })}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all text-base flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(37,99,235,0.3)]">
          {selected.size === 0 ? 'Selecione ao menos 1 card' : `Começar estudo → ${selected.size < cardCount ? `(${selected.size} cards)` : ''}`}
        </button>
      </div>
    </div>
  );
}

// ─── StudyPage ─────────────────────────────────────────────────────────────────
export default function StudyPage() {
  const { deckId } = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const { theme }  = useTheme();
  const isDark     = theme === 'dark';

  const location    = useLocation();
  const customCards = location.state?.cards || null;
  const customTitle = location.state?.title || null;
  const searchParams = new URLSearchParams(location.search);
  const dueOnly     = searchParams.get('mode') === 'due';

  // Dados
  const [deck, setDeck]     = useState(null);
  const [allCards, setAllCards] = useState([]);  // lista original
  const [cards, setCards]   = useState([]);       // lista em uso (embaralhada ou não)
  const [loading, setLoading] = useState(true);

  // Sessão
  const [setup, setSetup]       = useState(true);  // mostra tela de setup antes
  const [focusMode, setFocusMode] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  // Card atual
  const [index, setIndex]       = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [scores, setScores]     = useState([]);
  const [answered, setAnswered] = useState(false);
  const [done, setDone]         = useState(false);
  const [animating, setAnimating] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [editingCard, setEditingCard] = useState(null); // card sendo editado inline

  const [countdown, setCountdown] = useState(0); // 3-2-1-0=go
  const [wrongCards, setWrongCards] = useState([]); // cards errados para revisão rápida
  const [scoreAnim, setScoreAnim]   = useState(null); // { score, label, color } para animação
  const [history, setHistory]       = useState([]); // histórico para permitir voltar

  useEffect(() => {
    if (customCards) {
      setAllCards(customCards);
      setCards(customCards);
      setDeck({ name: customTitle || 'Sessão de estudo', emoji: '📚' });
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const endpoint = dueOnly ? `/flashcards/deck/${deckId}/study` : `/flashcards/deck/${deckId}`;
        const [deckRes, cardsRes] = await Promise.all([api.get(`/decks/${deckId}`), api.get(endpoint)]);
        setDeck({ ...deckRes.data, dueMode: dueOnly });
        setAllCards(cardsRes.data);
        setCards(cardsRes.data);
      } catch { toast('Erro ao carregar deck.', 'error'); }
      finally { setLoading(false); }
    };
    load();
  }, [deckId]);

  // Countdown 3-2-1-Go
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => {
      if (countdown === 1) setCountdown(0); // Go!
      else setCountdown((v) => v - 1);
    }, 800);
    return () => clearTimeout(id);
  }, [countdown]);

  // Timer
  useEffect(() => {
    if (setup || timerSec === 0 || flipped || answered || done) {
      clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(timerSec);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          // Tempo esgotado — vira automaticamente
          setFlipped(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [index, setup, timerSec, answered, done]);

  const saveSession = async (finalScores) => {
    const correct = finalScores.filter((s) => s >= 3).length;
    const wrong   = finalScores.filter((s) => s < 3).length;
    if (deckId) {
      try { await api.post('/study/session', { deckId, totalCards: cards.length, correct, wrong }); } catch {}
      return;
    }
    if (customCards) {
      const byDeck = {};
      cards.forEach((card, i) => {
        const did = card.deckId?._id || card.deckId;
        if (!did) return;
        if (!byDeck[did]) byDeck[did] = { correct: 0, wrong: 0, total: 0 };
        byDeck[did].total++;
        if (finalScores[i] >= 3) byDeck[did].correct++;
        else byDeck[did].wrong++;
      });
      try { await Promise.all(Object.entries(byDeck).map(([did, s]) => api.post('/study/session', { deckId: did, totalCards: s.total, correct: s.correct, wrong: s.wrong }))); } catch {}
    }
  };

  const playAudio = (src) => {
    if (!src) return;
    const a = new Audio(src);
    a.play().catch(() => {});
  };

  const handleEdit = () => setEditingCard({ ...cards[index] });

  const handleEditSaved = (updated) => {
    setCards((prev) => prev.map((c) => c._id === updated._id ? updated : c));
    setEditingCard(null);
    toast('Card atualizado!', 'success');
  };

  const handleScore = useCallback(async (score) => {
    if (answered || !flipped) return;
    clearInterval(timerRef.current);
    setAnswered(true);

    // Salvar no histórico para poder voltar
    setHistory((prev) => [...prev, { index, scores: [...scores], wrongCards: [...wrongCards] }]);

    // Animação da nota escolhida
    const chosen = SCALE.find((s) => s.score === score);
    setScoreAnim(chosen);
    setTimeout(() => setScoreAnim(null), 900);

    const nextScores = [...scores, score];
    setScores(nextScores);
    if (score <= 2) setWrongCards((prev) => [...prev, cards[index]]);
    const days = SCALE.find((s) => s.score === score)?.days || 1;
    try { await api.put(`/flashcards/${cards[index]._id}/review`, { days }); } catch {}
    setAnimating(true);
    setTimeout(async () => {
      setAnimating(false);
      setFlipped(false);
      setAnswered(false);
      if (index + 1 >= cards.length) { await saveSession(nextScores); setDone(true); }
      else setIndex((v) => v + 1);
    }, 350);
  }, [answered, flipped, scores, cards, index, wrongCards]);

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setIndex(prev.index);
    setScores(prev.scores);
    setWrongCards(prev.wrongCards);
    setFlipped(true);  // mostra verso já virado para poder reavaliar
    setAnswered(false);
    setAnimating(false);
  };

  const handleFavorite = async () => {
    const card = cards[index];
    try {
      const res = await api.patch(`/flashcards/${card._id}/favorite`);
      setCards((prev) => prev.map((c) => c._id === card._id ? { ...c, isFavorite: res.data.isFavorite } : c));
      toast(res.data.isFavorite ? 'Favoritado ⭐' : 'Removido dos favoritos', 'info');
    } catch {}
  };

  // Atalhos de teclado
  useEffect(() => {
    if (setup || editingCard) return;
    const handler = (e) => {
      if (done || loading) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!answered) {
          setFlipped((v) => {
            if (!v) playAudio(cards[index]?.backAudio); // toca áudio do verso ao virar
            return !v;
          });
        }
      }
      if ((e.key === 'f' || e.key === 'F') && !answered) handleFavorite();
      if ((e.key === 'e' || e.key === 'E') && !answered) handleEdit();
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5 && flipped && !answered) handleScore(num);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setup, flipped, answered, done, loading, handleScore, editingCard, index, cards]);

  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const restart = (newShuffled = true) => {
    setCards(newShuffled ? shuffle(allCards) : [...allCards]);
    setIndex(0); setFlipped(false); setScores([]); setAnswered(false); setDone(false);
  };

  const handleStart = ({ shuffled, timerSec: t, focusMode: fm, selectedCards }) => {
    const base = selectedCards || allCards;
    setCards(shuffled ? shuffle(base) : [...base]);
    setTimerSec(t);
    setFocusMode(fm);
    setSetup(false);
    setCountdown(3);
  };

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <Loader2 size={28} className="animate-spin text-slate-600" />
    </div>
  );

  // ── Setup ──
  if (setup && !loading) return (
    <SetupScreen
      deckName={deck?.name || 'Sessão de estudo'}
      allCards={allCards}
      onStart={handleStart}
      onBack={() => navigate(deckId ? `/deck/${deckId}` : '/dashboard')}
      isDark={isDark}
    />
  );

  // ── Resultado ──
  if (done) return (
    <ResultScreen total={cards.length} scores={scores} wrongCards={wrongCards}
      onRestart={() => { setSetup(true); setDone(false); setWrongCards([]); }}
      onRetryWrong={() => {
        if (wrongCards.length === 0) return;
        setCards(wrongCards); setWrongCards([]);
        setIndex(0); setFlipped(false); setScores([]); setAnswered(false); setDone(false);
      }}
      onBack={() => navigate('/dashboard')} />
  );

  // ── Countdown ──
  if (countdown > 0) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <div key={countdown} className="text-9xl font-black text-white animate-ping-once select-none" style={{ animationDuration: '0.6s' }}>
        {countdown}
      </div>
    </div>
  );

  // ── Sem cards ──
  if (cards.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="p-5 rounded-2xl bg-white/4 text-slate-600 mb-2"><BookOpen size={36} /></div>
      <h2 className="text-white font-bold text-xl">Nenhum card para estudar</h2>
      <p className="text-slate-500 text-sm max-w-xs">Adicione flashcards neste deck antes de estudar.</p>
      <button onClick={() => navigate(`/deck/${deckId}`)}
        className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm">
        Ir para o deck
      </button>
    </div>
  );

  const card     = cards[index];
  const progress = (index / cards.length) * 100;
  const timerPct = timerSec > 0 ? (timeLeft / timerSec) * 100 : 100;
  const timerColor = timerPct > 50 ? 'bg-emerald-500' : timerPct > 25 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="min-h-screen text-slate-200 flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar — escondida no modo foco */}
      {/* Modal confirmação de saída */}
      {confirmExit && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass rounded-3xl border border-white/10 p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-white font-bold text-lg mb-2">Sair da sessão?</h3>
            <p className="text-slate-500 text-sm mb-8">
              Você está no card {index + 1} de {cards.length}. O progresso desta sessão será perdido.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmExit(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 font-semibold py-3 rounded-xl transition-all text-sm">
                Continuar
              </button>
              <button onClick={() => navigate(deckId ? `/deck/${deckId}` : '/dashboard')}
                className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 font-semibold py-3 rounded-xl transition-all text-sm">
                Sair mesmo assim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edição inline */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/75 z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-md glass rounded-3xl border border-white/10 flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header fixo */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8 flex-shrink-0">
              <h3 className="text-white font-bold">Editar card</h3>
              <button onClick={() => setEditingCard(null)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            {/* Corpo com scroll interno */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-widest font-semibold block mb-1.5">Frente</label>
                <textarea rows={3} value={editingCard.front}
                  onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })}
                  className="w-full bg-white/4 border border-white/8 focus:border-blue-500/50 px-3 py-2.5 rounded-xl outline-none text-white text-sm resize-none transition-all" />
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-widest font-semibold block mb-1.5">Verso</label>
                <textarea rows={3} value={editingCard.back}
                  onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })}
                  className="w-full bg-white/4 border border-white/8 focus:border-blue-500/50 px-3 py-2.5 rounded-xl outline-none text-white text-sm resize-none transition-all" />
              </div>
              {editingCard.notes !== undefined && (
                <div>
                  <label className="text-xs text-slate-500 uppercase tracking-widest font-semibold block mb-1.5">Anotação</label>
                  <textarea rows={2} value={editingCard.notes}
                    onChange={(e) => setEditingCard({ ...editingCard, notes: e.target.value })}
                    className="w-full bg-amber-500/5 border border-amber-500/15 focus:border-amber-500/40 px-3 py-2.5 rounded-xl outline-none text-amber-200/70 text-sm resize-none transition-all placeholder-amber-700"
                    placeholder="Anotação opcional..." />
                </div>
              )}
            </div>
            {/* Footer fixo */}
            <div className="flex gap-3 px-6 pb-6 pt-4 border-t border-white/8 flex-shrink-0">
              <button onClick={() => setEditingCard(null)}
                className="flex-1 bg-white/5 border border-white/8 text-slate-400 font-semibold py-2.5 rounded-xl text-sm transition-all hover:bg-white/10">
                Cancelar
              </button>
              <button onClick={async () => {
                try {
                  const res = await api.put(`/flashcards/${editingCard._id}`, {
                    front: editingCard.front,
                    back: editingCard.back,
                    notes: editingCard.notes,
                  });
                  handleEditSaved(res.data);
                } catch { toast('Erro ao salvar.', 'error'); }
              }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-all">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {!focusMode && <Navbar />}

      {/* ── Animação da nota escolhida ── */}
      {scoreAnim && (
        <div className="fixed inset-0 z-[80] pointer-events-none flex items-center justify-center">
          <div
            key={scoreAnim.score + Date.now()}
            className="animate-score-pop flex flex-col items-center gap-3"
          >
            <div className="relative rounded-3xl px-12 py-8 flex flex-col items-center gap-2"
              style={{
                backgroundColor: '#0A0A14',
                border: `2px solid ${scoreAnim.rawColor}`,
                boxShadow: `0 0 40px ${scoreAnim.rawColor}55, 0 0 80px ${scoreAnim.rawColor}22`,
              }}>
              <span className="text-8xl font-black leading-none"
                style={{ color: scoreAnim.rawColor }}>
                {scoreAnim.score}
              </span>
              <span className="text-base font-bold tracking-wide"
                style={{ color: scoreAnim.rawColor }}>
                {scoreAnim.label}
              </span>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 pb-10 relative z-10 ${focusMode ? 'pt-8' : 'pt-28'}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => index > 0 ? setConfirmExit(true) : navigate(deckId ? `/deck/${deckId}` : '/dashboard')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm transition-colors group">
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Sair
            </button>
            {/* Botão voltar card — sempre visível quando há histórico */}
            {history.length > 0 && (
              <button onClick={handleUndo}
                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-400 transition-all px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20">
                <RotateCcw size={12} /> Voltar
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            {deck?.dueMode && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1">
                <RotateCcw size={10} /> Revisão rápida
              </span>
            )}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 size={14} /> {scores.filter((s) => s >= 3).length}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-red-400 font-semibold flex items-center gap-1">
                <XCircle size={14} /> {scores.filter((s) => s < 3).length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleFavorite} title="Favoritar (F)"
              className={`p-1.5 rounded-lg transition-all ${card.isFavorite ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
              <Star size={15} fill={card.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handleEdit} title="Editar card (E)"
              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-400 transition-all">
              <Pencil size={15} />
            </button>
            <button onClick={() => setFocusMode((v) => !v)} title="Modo foco"
              className="p-1.5 rounded-lg text-slate-600 hover:text-purple-400 transition-all">
              {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <span className="text-slate-500 text-sm font-medium">{index + 1} / {cards.length}</span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Timer bar */}
        {timerSec > 0 && !flipped && (
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mb-8">
            <div className={`h-full rounded-full transition-all duration-1000 ${timerColor}`} style={{ width: `${timerPct}%` }} />
          </div>
        )}
        {!(timerSec > 0 && !flipped) && <div className="mb-8" />}

        {/* Card */}
        <div className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <div className="w-full cursor-pointer select-none" style={{ perspective: '1200px' }}
            onClick={() => !answered && setFlipped((v) => !v)}>
            <div className="relative w-full transition-transform duration-500"
              style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '360px' }}>

              {/* Frente */}
              <div className="absolute inset-0 glass rounded-3xl border border-white/8 p-10 flex flex-col justify-between overflow-auto"
                style={{ backfaceVisibility: 'hidden' }}>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Pergunta</span>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
                  {card.frontImage && <ZoomableImage src={card.frontImage} alt="frente" className="max-h-48 max-w-full object-contain rounded-xl" />}
                  {card.front && <p className="card-back-text text-xl font-medium leading-relaxed text-center" style={{ color: 'var(--text)' }}>{card.front}</p>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    {timerSec > 0 && !flipped && <span className="tabular-nums font-mono text-amber-400">{timeLeft}s</span>}
                    <RotateCcw size={12} /> Clique para ver a resposta
                  </div>
                  {card.frontAudio && (
                    <AudioPlayBtn src={card.frontAudio} side="front" onClick={(e) => e.stopPropagation()} />
                  )}
                </div>
              </div>

              {/* Verso */}
              <div className="absolute inset-0 glass rounded-3xl border border-blue-500/20 p-10 flex flex-col justify-between overflow-auto"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'rgba(79, 142, 247, 0.04)' }}>
                <span className="text-[10px] font-bold text-blue-500/50 uppercase tracking-widest">Resposta</span>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-4">
                  {card.backImage && <ZoomableImage src={card.backImage} alt="verso" className="max-h-48 max-w-full object-contain rounded-xl" />}
                  {card.back && <p className="card-back-text text-xl font-medium leading-relaxed text-center" style={{ color: 'var(--text)' }}>{card.back}</p>}
                  {card.notes && (
                    <div className="w-full mt-2 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
                      <p className="text-xs text-amber-400/80 uppercase tracking-widest font-semibold mb-1">📝 Anotação</p>
                      <p className="text-sm text-amber-300/70 italic leading-relaxed">{card.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-blue-500/30 text-xs">Como você se saiu?</p>
                  {card.backAudio && (
                    <AudioPlayBtn src={card.backAudio} side="back" onClick={(e) => e.stopPropagation()} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Escala 1-5 */}
          <div className={`w-full mt-5 transition-all duration-300 ${flipped && !answered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
            <p className="text-slate-600 text-xs uppercase tracking-widest font-semibold mb-3 text-center">Como foi?</p>
            <div className="grid grid-cols-5 gap-2">
              {SCALE.map(({ score, label, color, bg }) => (
                <button key={score} onClick={() => handleScore(score)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border font-semibold transition-all text-xs active:scale-95 ${bg} ${color}`}>
                  <span className="text-base font-bold">{score}</span>
                  <span className="leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hints */}
          <p className="mt-4 text-slate-700 text-[11px] text-center">
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono mr-1 ${isDark ? 'bg-white/8 text-slate-400' : 'bg-black/8 text-slate-500'}`}>Espaço</kbd>virar
            {' · '}
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono mx-1 ${isDark ? 'bg-white/8 text-slate-400' : 'bg-black/8 text-slate-500'}`}>F</kbd>favoritar
            {' · '}
            <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono mx-1 ${isDark ? 'bg-white/8 text-slate-400' : 'bg-black/8 text-slate-500'}`}>E</kbd>editar
            {flipped && !answered && (
              <> · <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono mx-1 ${isDark ? 'bg-white/8 text-slate-400' : 'bg-black/8 text-slate-500'}`}>1–5</kbd>avaliar</>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}