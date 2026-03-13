import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Loader2, BookOpen, Copy, Check, ArrowLeft, Download } from 'lucide-react';
import api from '../services/api';

export default function SharePage() {
  const { token } = useParams();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const toast     = useToast();

  const [data, setData]       = useState(null);  // { deck, cards }
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/decks/share/${token}`)
      .then((r) => setData(r.data))
      .catch(() => setError('Link inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleClone = async () => {
    if (!user) { navigate('/login'); return; }
    setCloning(true);
    try {
      const res = await api.post(`/decks/share/${token}/clone`);
      toast(`"${data.deck.name}" adicionado aos seus decks!`, 'success');
      navigate(`/deck/${res.data._id}`);
    } catch { toast('Erro ao clonar deck.', 'error'); }
    finally { setCloning(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <Loader2 size={28} className="animate-spin text-slate-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-5xl mb-2">🔒</div>
      <h1 className="text-white font-bold text-xl">Link inválido</h1>
      <p className="text-slate-500 text-sm">{error}</p>
      <button onClick={() => navigate('/')} className="mt-4 text-blue-400 text-sm hover:underline">Ir para o início</button>
    </div>
  );

  const { deck, cards } = data;

  return (
    <div className="min-h-screen text-slate-200" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <main className="max-w-2xl mx-auto px-6 pt-16 pb-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            <BookOpen size={12} /> Deck compartilhado
          </div>
          <div className="text-5xl mb-4">{deck.emoji || '📚'}</div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{deck.name}</h1>
          {deck.description && <p className="text-slate-500 text-sm mb-3">{deck.description}</p>}
          {(deck.tags||[]).length > 0 && (
            <div className="flex gap-2 justify-center flex-wrap mb-3">
              {deck.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/70">#{t}</span>
              ))}
            </div>
          )}
          <p className="text-slate-600 text-sm">{cards.length} flashcard{cards.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Ações */}
        <div className="flex gap-3 mb-10">
          <button onClick={handleClone} disabled={cloning}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            {cloning ? <><Loader2 size={16} className="animate-spin" /> Adicionando...</> : <><Download size={16} /> {user ? 'Adicionar ao meu FlashMind' : 'Entrar para salvar'}</>}
          </button>
          <button onClick={copyLink}
            className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/8 text-sm font-medium transition-all text-slate-300">
            {copied ? <><Check size={15} className="text-emerald-400" /> Copiado!</> : <><Copy size={15} /> Copiar link</>}
          </button>
        </div>

        {/* Preview dos cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Preview dos cards</h2>
          {cards.slice(0, 8).map((card) => (
            <div key={card._id} className="glass rounded-2xl border border-white/5 p-4 flex gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1">Frente</p>
                <p className="text-white text-sm leading-relaxed line-clamp-2">{card.front || <span className="text-slate-600 italic">— só mídia —</span>}</p>
              </div>
              <div className="w-px bg-white/5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-500/50 font-semibold uppercase tracking-widest mb-1">Verso</p>
                <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">{card.back || <span className="text-slate-600 italic">— só mídia —</span>}</p>
              </div>
            </div>
          ))}
          {cards.length > 8 && (
            <p className="text-center text-slate-600 text-sm py-2">+ {cards.length - 8} cards não exibidos</p>
          )}
        </div>

        <div className="mt-10 text-center">
          <a href="/" className="text-blue-400 text-sm hover:underline">Criar minha conta no FlashMind</a>
        </div>
      </main>
    </div>
  );
}