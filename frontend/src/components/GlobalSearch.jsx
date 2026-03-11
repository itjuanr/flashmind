import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Book, LayoutGrid, X, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function GlobalSearch() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState({ decks: [], cards: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();
  const wrapRef  = useRef();

  // Atalho Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQ(''); setResults({ decks: [], cards: [] }); }
  }, [open]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounce da busca
  useEffect(() => {
    if (q.length < 2) { setResults({ decks: [], cards: [] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(q)}`);
        setResults(res.data);
      } catch { /* silencia */ }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const go = (path) => { navigate(path); setOpen(false); };
  const hasResults = results.decks.length > 0 || results.cards.length > 0;

  return (
    <>
      {/* Botão trigger na Navbar */}
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
          isDark
            ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/8'
            : 'text-slate-500 hover:text-slate-800 hover:bg-black/5 border border-black/8'
        }`}
      >
        <Search size={14} />
        <span className="hidden sm:inline">Buscar</span>
        <kbd className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/8 text-slate-500' : 'bg-black/8 text-slate-400'}`}>
          ⌘K
        </kbd>
      </button>

      {/* Modal de busca */}
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-24 px-4">
          <div ref={wrapRef} className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
            {/* Input */}
            <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${isDark ? 'border-white/8' : 'border-black/6'}`}>
              {loading ? <Loader2 size={16} className="text-slate-500 animate-spin flex-shrink-0" /> : <Search size={16} className="text-slate-500 flex-shrink-0" />}
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar decks e cards..."
                className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-slate-600' : 'text-slate-800 placeholder-slate-400'}`}
              />
              {q && (
                <button onClick={() => setQ('')} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Resultados */}
            <div className="max-h-80 overflow-y-auto">
              {q.length < 2 ? (
                <p className="text-slate-600 text-xs text-center py-8">Digite ao menos 2 caracteres</p>
              ) : !hasResults && !loading ? (
                <p className="text-slate-600 text-xs text-center py-8">Nenhum resultado para "{q}"</p>
              ) : (
                <>
                  {results.decks.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Decks</p>
                      {results.decks.map((d) => (
                        <button key={d._id} onClick={() => go(`/deck/${d._id}`)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/4'}`}>
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${d.color || '#4F8EF7'}20` }}>
                            <LayoutGrid size={13} style={{ color: d.color || '#4F8EF7' }} />
                          </div>
                          <span className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{d.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {results.cards.length > 0 && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest px-4 pt-3 pb-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Cards</p>
                      {results.cards.map((c) => (
                        <button key={c._id} onClick={() => go(`/deck/${c.deckId?._id || c.deckId}`)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/4'}`}>
                          <div className="p-1.5 rounded-lg bg-blue-500/10">
                            <Book size={13} className="text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{c.front}</p>
                            {c.deckId?.name && <p className="text-xs text-slate-500 truncate">{c.deckId.name}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer com hint */}
            <div className={`px-4 py-2 border-t flex items-center gap-3 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
              <span className="text-slate-600 text-[10px]"><kbd className="font-mono">↵</kbd> abrir · <kbd className="font-mono">Esc</kbd> fechar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}