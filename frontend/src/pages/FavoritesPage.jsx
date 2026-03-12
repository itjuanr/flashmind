import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Star, Loader2, ChevronDown, BookOpen, Play, Book, Check, X } from 'lucide-react';

// ── SelectableCard com flip 3D ───────────────────────────────────────────────
function SelectableCard({ card, selected, onToggle, onFavorite }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="relative" style={{ perspective: '1000px' }}>

      {/* Checkbox quadrado */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(card._id); }}
        className={`absolute -top-2 -left-2 z-30 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shadow-sm ${
          selected
            ? 'bg-blue-500 border-blue-500'
            : isDark
              ? 'bg-[#0F0F18] border-white/25 hover:border-blue-400'
              : 'bg-white border-black/20 hover:border-blue-400'
        }`}
      >
        {selected && <Check size={10} className="text-white" strokeWidth={3} />}
      </button>

      {/* Wrapper 3D */}
      <div
        className={`relative w-full transition-transform duration-500 cursor-pointer ${selected ? 'ring-2 ring-blue-500/40 rounded-2xl' : ''}`}
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: '220px',
        }}
        onClick={() => setFlipped((v) => !v)}
      >
        {/* FRENTE */}
        <div
          className={`absolute inset-0 rounded-2xl border p-4 flex flex-col justify-between overflow-auto ${
            isDark ? 'glass border-white/8' : 'bg-white/80 border-black/8 shadow-sm'
          }`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Pergunta</span>
            <button onClick={(e) => { e.stopPropagation(); onFavorite(card); }} className="p-1 rounded text-amber-400 hover:bg-amber-500/10 transition-colors">
              <Star size={11} fill="currentColor" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-1 min-h-0">
            {card.frontImage && <img src={card.frontImage} alt="" className="max-h-24 object-contain rounded-lg" />}
            {card.front && <p className="text-sm leading-snug text-center " style={{ color: 'var(--text)' }}>{card.front}</p>}
          </div>
          <p className="text-slate-500 text-[10px] text-center">Clique para ver a resposta</p>
        </div>

        {/* VERSO */}
        <div
          className="absolute inset-0 rounded-2xl border p-4 flex flex-col justify-between overflow-auto"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: isDark ? 'rgba(79,142,247,0.05)' : 'rgba(79,142,247,0.04)',
            borderColor: 'rgba(79,142,247,0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-blue-500/60 uppercase tracking-widest">Resposta</span>
            <button onClick={(e) => { e.stopPropagation(); onFavorite(card); }} className="p-1 rounded text-amber-400 hover:bg-amber-500/10 transition-colors">
              <Star size={11} fill="currentColor" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-1 min-h-0">
            {card.backImage && <img src={card.backImage} alt="" className="max-h-24 object-contain rounded-lg" />}
            {card.back && <p className="text-sm leading-snug text-center " style={{ color: 'var(--text)' }}>{card.back}</p>}
          </div>
          <p className="text-blue-500/40 text-[10px] text-center">Clique para voltar</p>
        </div>
      </div>
    </div>
  );
}

// ── FavoritesPage ────────────────────────────────────────────────────────────
export default function FavoritesPage() {
  const toast    = useToast();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [cards, setCards]                 = useState([]);
  const [favoriteDecks, setFavoriteDecks] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedDeck, setSelectedDeck]   = useState('all');
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [selectedCards, setSelectedCards] = useState([]); // IDs selecionados p/ estudar

  useEffect(() => {
    const load = async () => {
      try {
        const [cardsRes, decksRes] = await Promise.all([
          api.get('/study/favorites'),
          api.get('/decks'),
        ]);
        setCards(cardsRes.data);
        setFavoriteDecks((decksRes.data || []).filter((d) => d.isFavorite));
      } catch {
        toast('Erro ao carregar favoritos.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cardDecks = Array.from(
    new Map(cards.filter((c) => c.deckId).map((c) => [c.deckId._id, c.deckId])).values()
  );

  const filtered = selectedDeck === 'all' ? cards : cards.filter((c) => c.deckId?._id === selectedDeck);
  const selectedLabel = selectedDeck === 'all' ? 'Todos os decks' : cardDecks.find((d) => d._id === selectedDeck)?.name || 'Todos os decks';

  const toggleCard = (id) => setSelectedCards((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  const toggleAll  = () => setSelectedCards((prev) => prev.length === filtered.length ? [] : filtered.map((c) => c._id));

  const handleFavoriteCard = async (card) => {
    try {
      const res = await api.patch(`/flashcards/${card._id}/favorite`);
      if (!res.data.isFavorite) {
        setCards((prev) => prev.filter((c) => c._id !== card._id));
        setSelectedCards((prev) => prev.filter((id) => id !== card._id));
        toast('Removido dos favoritos.', 'info');
      } else {
        setCards((prev) => prev.map((c) => (c._id === card._id ? res.data : c)));
      }
    } catch { toast('Erro ao atualizar favorito.', 'error'); }
  };

  const handleUnfavoriteDeck = async (deckId) => {
    try {
      await api.patch(`/decks/${deckId}/favorite`);
      setFavoriteDecks((prev) => prev.filter((d) => d._id !== deckId));
      toast('Deck removido dos favoritos.', 'info');
    } catch { toast('Erro.', 'error'); }
  };

  const handleStudySelected = () => {
    const toStudy = cards.filter((c) => selectedCards.includes(c._id));
    if (toStudy.length === 0) return;
    navigate('/study/custom', {
      state: { cards: toStudy, title: `${toStudy.length} favorito${toStudy.length > 1 ? 's' : ''}` },
    });
  };

  const surface = isDark ? 'glass border-white/8' : 'bg-white/70 border-black/8 shadow-sm';

  return (
    <div className="min-h-screen text-slate-200" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-32 relative z-10">

        {/* Header */}
        <div className="mb-10">
          <p className="text-slate-500 text-sm mb-1 flex items-center gap-1.5">
            <Star size={13} className="text-amber-400" fill="currentColor" /> Favoritos
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">Seus favoritos</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-600" /></div>
        ) : favoriteDecks.length === 0 && cards.length === 0 ? (
          /* Empty state global */
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className={`p-6 rounded-3xl mb-6 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
              <Star size={40} className="text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Nenhum favorito ainda</h3>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-8">
              Marque decks e cards com ⭐ durante o estudo para encontrá-los aqui rapidamente.
            </p>
            <button onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm flex items-center gap-2">
              <BookOpen size={15} /> Ir para meus decks
            </button>
          </div>
        ) : (
          <>
            {/* ── Decks favoritos ── */}
            {favoriteDecks.length > 0 && (
              <section className="mb-12">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Star size={12} className="text-amber-400" fill="currentColor" /> Decks favoritos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favoriteDecks.map((deck) => (
                    <div
                      key={deck._id}
                      className={`${surface} rounded-2xl border p-5 flex flex-col justify-between group relative overflow-hidden cursor-pointer transition-all hover:border-blue-500/30`}
                      style={{ minHeight: '110px' }}
                    >
                      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity pointer-events-none" style={{ backgroundColor: deck.color || '#4F8EF7' }} />
                      <div className="absolute inset-0 z-0" onClick={() => navigate(`/deck/${deck._id}`)} />
                      <div className="relative z-10 flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          {deck.deckImage ? <img src={deck.deckImage} alt={deck.name} className="w-8 h-8 rounded-lg object-cover" /> : <span className="text-xl">{deck.emoji || '📚'}</span>}
                          <div>
                            <p className="text-white font-semibold text-sm leading-tight">{deck.name}</p>
                            {deck.description && <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{deck.description}</p>}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleUnfavoriteDeck(deck._id); }} className="relative z-10 p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors opacity-0 group-hover:opacity-100" title="Remover dos favoritos">
                          <Star size={13} fill="currentColor" />
                        </button>
                      </div>
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500 text-xs"><Book size={11} /> {deck.flashcardCount || 0} cards</span>
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/study/${deck._id}`); }} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all" style={{ backgroundColor: `${deck.color || '#4F8EF7'}18`, color: deck.color || '#4F8EF7' }}>
                          <Play size={10} fill="currentColor" /> Estudar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Cards favoritos ── */}
            <section>
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Star size={12} className="text-amber-400" fill="currentColor" /> Cards favoritos
                </h2>

                <div className="flex items-center gap-2">
                  {/* Filtro por deck */}
                  {cardDecks.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => setDropdownOpen((v) => !v)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                          isDark ? 'glass border-white/8 text-slate-300 hover:border-white/15' : 'bg-white/70 border-black/8 text-slate-600 hover:border-black/15'
                        }`}
                      >
                        {selectedDeck !== 'all' && <span>{cardDecks.find((d) => d._id === selectedDeck)?.emoji || '📚'}</span>}
                        <span>{selectedLabel}</span>
                        <ChevronDown size={13} className={`text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {dropdownOpen && (
                        <div className={`absolute right-0 top-full mt-2 w-52 rounded-xl border overflow-hidden shadow-xl z-20 ${isDark ? 'glass border-white/10' : 'bg-white border-black/8'}`}>
                          {[{ _id: 'all', name: 'Todos os decks', emoji: '✨' }, ...cardDecks].map((d) => (
                            <button key={d._id} onClick={() => { setSelectedDeck(d._id); setDropdownOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors ${selectedDeck === d._id ? 'bg-blue-500/15 text-blue-400' : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-black/5'}`}>
                              <span>{d.emoji}</span><span className="truncate">{d.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Toggle selecionar todos */}
                  {filtered.length > 0 && (
                    <button
                      onClick={toggleAll}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                        selectedCards.length === filtered.length
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                          : isDark ? 'border-white/8 text-slate-500 hover:text-slate-300' : 'border-black/8 text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {selectedCards.length === filtered.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="p-5 rounded-2xl bg-white/4 text-slate-600 mb-5"><Star size={36} /></div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {cards.length === 0 ? 'Nenhum card favorito ainda' : 'Nenhum favorito neste deck'}
                  </h3>
                  <p className="text-slate-500 text-sm max-w-xs">
                    {cards.length === 0 ? 'Marque flashcards com ⭐ para encontrá-los aqui.' : 'Tente selecionar outro deck.'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-slate-600 text-sm mb-5">{filtered.length} card{filtered.length !== 1 ? 's' : ''}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((card) => (
                      <div key={card._id}>
                        {selectedDeck === 'all' && card.deckId && (
                          <div className="flex items-center gap-1.5 mb-2 px-1">
                            <span className="text-xs">{card.deckId.emoji || '📚'}</span>
                            <span className="text-xs font-medium truncate" style={{ color: card.deckId.color || '#4F8EF7' }}>{card.deckId.name}</span>
                          </div>
                        )}
                        <SelectableCard
                          card={card}
                          selected={selectedCards.includes(card._id)}
                          onToggle={toggleCard}
                          onFavorite={handleFavoriteCard}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>

      {/* ── Barra de estudar selecionados ── */}
      {selectedCards.length > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-3 border-t ${isDark ? 'bg-[#0A0A0F]/95 border-white/8' : 'bg-white/95 border-black/8'}`}>
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {selectedCards.length} card{selectedCards.length > 1 ? 's' : ''} selecionado{selectedCards.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedCards([])} className="p-2 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
                <X size={16} />
              </button>
              <button
                onClick={handleStudySelected}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all"
              >
                <BookOpen size={14} /> Estudar selecionados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}