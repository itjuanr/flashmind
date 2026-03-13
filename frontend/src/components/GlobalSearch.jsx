import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Book, LayoutGrid, X, Loader2, Filter, Volume2, Image as ImageIcon, Star } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

const FILTERS = [
  { value: 'all',    label: 'Tudo'      },
  { value: 'decks',  label: 'Decks'     },
  { value: 'cards',  label: 'Cards'     },
  { value: 'audio',  label: '🔊 Áudio'  },
  { value: 'image',  label: '🖼 Imagem' },
  { value: 'fav',    label: '⭐ Favoritos'},
  { value: 'notes',  label: '📝 Com nota'},
];

export default function GlobalSearch() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [open, setOpen]       = useState(false);
  const [q, setQ]             = useState('');
  const [filter, setFilter]   = useState('all');
  const [results, setResults] = useState({ decks: [], cards: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();
  const wrapRef  = useRef();

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(''); setResults({ decks: [], cards: [] }); setFilter('all'); }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (q.length < 2 && filter === 'all') { setResults({ decks: [], cards: [] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: q || '' });
        if (filter !== 'all') params.set('filter', filter);
        const res = await api.get(`/search?${params}`);
        setResults(res.data);
      } catch { /* silencia */ }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, filter]);

  // Filtros client-side adicionais
  const filteredCards = results.cards.filter((c) => {
    if (filter === 'audio') return c.frontAudio || c.backAudio;
    if (filter === 'image') return c.frontImage || c.backImage;
    if (filter === 'fav')   return c.isFavorite;
    if (filter === 'notes') return c.notes;
    return true;
  });

  const go = (path) => { navigate(path); setOpen(false); };
  const hasResults = (filter === 'decks' ? 0 : filteredCards.length) + (filter === 'cards' || filter === 'audio' || filter === 'image' || filter === 'fav' || filter === 'notes' ? 0 : results.decks.length) > 0
    || filteredCards.length > 0 || results.decks.length > 0;

  const showDecks = !['cards','audio','image','fav','notes'].includes(filter);
  const showCards = filter !== 'decks';

  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
          isDark ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/8'
          : 'text-slate-500 hover:text-slate-800 hover:bg-black/5 border border-black/8'
        }`}>
        <Search size={14} />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/8 text-slate-500' : 'bg-black/8 text-slate-400'}`}>⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-start justify-center pt-24 px-4" onClick={() => setOpen(false)}>
          <div ref={wrapRef} onClick={(e) => e.stopPropagation()} className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>

            {/* Input */}
            <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${isDark ? 'border-white/8' : 'border-black/6'}`}>
              {loading ? <Loader2 size={16} className="text-slate-500 animate-spin flex-shrink-0" /> : <Search size={16} className="text-slate-500 flex-shrink-0" />}
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar decks e cards..."
                className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'}`} />
              {q && (
                <button onClick={() => setQ('')} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={14} /></button>
              )}
            </div>

            {/* Filtros */}
            <div className={`flex items-center gap-1 px-3 py-2 overflow-x-auto border-b ${isDark ? 'border-white/8' : 'border-black/6'}`}>
              <Filter size={11} className="text-slate-600 flex-shrink-0 mr-1" />
              {FILTERS.map((f) => (
                <button key={f.value} onClick={() => setFilter(f.value)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    filter === f.value
                      ? 'bg-blue-500/20 text-blue-400'
                      : isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' : 'text-slate-500 hover:bg-black/5'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Resultados */}
            <div className="max-h-72 overflow-y-auto">
              {q.length < 2 && filter === 'all' ? (
                <p className="text-slate-600 text-xs text-center py-8">Digite ao menos 2 caracteres</p>
              ) : !hasResults && !loading ? (
                <p className="text-slate-600 text-xs text-center py-8">Nenhum resultado{q ? ` para "${q}"` : ''}</p>
              ) : (
                <>
                  {showDecks && results.decks.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Decks</p>
                      {results.decks.map((d) => (
                        <button key={d._id} onClick={() => go(`/deck/${d._id}`)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/4'}`}>
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${d.color || '#4F8EF7'}20` }}>
                            <LayoutGrid size={13} style={{ color: d.color || '#4F8EF7' }} />
                          </div>
                          <span className={`text-sm font-medium truncate flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{d.name}</span>
                          {(d.tags||[]).length > 0 && (
                            <span className="text-[10px] text-slate-600 truncate max-w-[80px]">{d.tags.slice(0,2).map(t=>`#${t}`).join(' ')}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {showCards && filteredCards.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Cards</p>
                      {filteredCards.map((c) => (
                        <button key={c._id} onClick={() => go(`/deck/${c.deckId?._id || c.deckId}`)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/4'}`}>
                          <div className="p-1.5 rounded-lg bg-blue-500/10 flex-shrink-0">
                            <Book size={13} className="text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{c.front || '—'}</p>
                            {c.deckId?.name && <p className="text-xs text-slate-500 truncate">{c.deckId.name}</p>}
                          </div>
                          {/* Badges */}
                          <div className="flex gap-1 flex-shrink-0">
                            {(c.frontAudio||c.backAudio) && <Volume2 size={10} className="text-blue-400/60" />}
                            {(c.frontImage||c.backImage) && <ImageIcon size={10} className="text-purple-400/60" />}
                            {c.isFavorite && <Star size={10} className="text-amber-400/60" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className={`px-4 py-2 border-t flex items-center gap-3 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
              <span className="text-slate-600 text-[10px]">
                <kbd className="font-mono">↵</kbd> abrir · <kbd className="font-mono">Esc</kbd> fechar
              </span>
              {(results.decks.length + filteredCards.length) > 0 && (
                <span className="text-slate-600 text-[10px] ml-auto">
                  {results.decks.length + filteredCards.length} resultado{results.decks.length + filteredCards.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}