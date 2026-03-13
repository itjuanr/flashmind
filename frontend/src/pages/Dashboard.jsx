import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  Plus, Book, Play, Trash2, X, Loader2, BrainCircuit,
  LayoutGrid, Pencil, Check, Star, RotateCcw, Image,
  BookOpen, GripVertical, ListOrdered, ChevronUp,
  ArrowDownAZ, ArrowUpAZ, Clock, Flame, Copy, Tag,
  SortAsc, ChevronDown, Sparkles, Bell,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'recent',   label: 'Mais recentes',    icon: Clock },
  { value: 'az',       label: 'A → Z',            icon: ArrowDownAZ },
  { value: 'za',       label: 'Z → A',            icon: ArrowUpAZ },
  { value: 'due',      label: 'Para revisar',      icon: RotateCcw },
  { value: 'progress', label: 'Progresso',         icon: Flame },
];

function sortDecks(decks, sortBy) {
  const copy = [...decks];
  switch (sortBy) {
    case 'az':       return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'za':       return copy.sort((a, b) => b.name.localeCompare(a.name));
    case 'due':      return copy.sort((a, b) => (b.dueCount || 0) - (a.dueCount || 0));
    case 'progress': return copy.sort((a, b) => {
      const pa = a.flashcardCount ? (a.masteredCount || 0) / a.flashcardCount : 0;
      const pb = b.flashcardCount ? (b.masteredCount || 0) / b.flashcardCount : 0;
      return pb - pa;
    });
    default:         return copy; // recent = ordem do backend (createdAt desc)
  }
}

// ─── Modal: Criar / Editar Deck ────────────────────────────────────────────────
function DeckModal({ onClose, onSaved, editing, toast }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileRef = useRef();
  const tagInputRef = useRef();

  const [form, setForm] = useState({
    name:        editing?.name        || '',
    description: editing?.description || '',
    emoji:       editing?.emoji       || '📚',
    color:       editing?.color       || '#4F8EF7',
    deckImage:   editing?.deckImage   || null,
    tags:        editing?.tags        || [],
    reviewSettings: editing?.reviewSettings || { notify: true, newCardDelay: 1 },
  });
  const [iconMode, setIconMode] = useState(editing?.deckImage ? 'image' : 'emoji');
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const emojis = ['📚', '🧬', '🌍', '💻', '🎯', '🔬', '🏛️', '✏️', '🎨', '🚀'];
  const colors = ['#4F8EF7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Imagem até 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, deckImage: reader.result }));
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || form.tags.includes(t) || form.tags.length >= 5) return;
    setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };

  const removeTag = (t) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Dê um nome para o deck.'); return; }
    setLoading(true);
    const payload = { ...form, deckImage: iconMode === 'image' ? form.deckImage : null };
    try {
      let res;
      if (editing) {
        res = await api.put(`/decks/${editing._id}`, payload);
        toast('Deck atualizado!', 'success');
      } else {
        res = await api.post('/decks', payload);
        toast('Deck criado com sucesso! 🎉', 'success');
      }
      onSaved(res.data, !!editing);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar deck.');
    } finally {
      setLoading(false);
    }
  };

  const surface = isDark ? 'bg-[#0F0F18]' : 'bg-white';
  const inputCls = `w-full border px-4 py-3 rounded-xl outline-none transition-all text-sm ${
    isDark
      ? 'bg-white/4 border-white/8 focus:border-blue-500/50 text-white placeholder-slate-600'
      : 'bg-black/3 border-black/8 focus:border-blue-500/50 text-slate-800 placeholder-slate-400'
  }`;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-md ${surface} rounded-3xl border ${isDark ? 'border-white/10' : 'border-black/8'} flex flex-col`} style={{ maxHeight: '90vh' }}>
        {/* Header fixo */}
        <div className={`flex items-center justify-between px-8 pt-7 pb-4 border-b ${isDark ? 'border-white/8' : 'border-black/6'} flex-shrink-0`}>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              {editing ? 'Editar deck' : 'Novo deck'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {editing ? 'Atualize as informações do deck.' : 'Organize seus flashcards por tema.'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"><X size={20} /></button>
        </div>
        {/* Corpo com scroll interno */}
        <div className="overflow-y-auto flex-1 px-8 py-6">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
          {/* Ícone */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Ícone</label>
              <div className="flex gap-1">
                {['emoji', 'image'].map((m) => (
                  <button key={m} type="button" onClick={() => setIconMode(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${iconMode === m ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
                    {m === 'emoji' ? '😀 Emoji' : '🖼️ Imagem'}
                  </button>
                ))}
              </div>
            </div>
            {iconMode === 'emoji' ? (
              <div className="flex gap-2 flex-wrap">
                {emojis.map((em) => (
                  <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${form.emoji === em ? 'bg-blue-500/20 ring-2 ring-blue-500/50' : isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>
                    {em}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {form.deckImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/20 mb-2">
                    <img src={form.deckImage} alt="ícone" className="w-full max-h-28 object-contain" />
                    <button type="button" onClick={() => setForm((f) => ({ ...f, deckImage: null }))}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-red-400 hover:bg-black/80"><X size={12} /></button>
                  </div>
                ) : (
                  <div onClick={() => fileRef.current?.click()}
                    className={`w-full border border-dashed rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer transition-all group ${isDark ? 'border-white/15 hover:border-blue-500/40' : 'border-black/15 hover:border-blue-500/40'}`}>
                    <Image size={22} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                    <span className="text-slate-500 text-xs">Clique para escolher uma imagem</span>
                    <span className="text-slate-600 text-xs">PNG, JPG, WEBP — máx 2MB</span>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              </div>
            )}
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Nome *</label>
            <input type="text" required placeholder="Ex: Biologia Celular" className={inputCls}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Descrição (opcional)</label>
            <textarea placeholder="Sobre o que é esse deck?" rows={2} className={`${inputCls} resize-none`}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Tags (máx 5)</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {form.tags.map((t) => (
                <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-medium">
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} className="text-blue-500/50 hover:text-red-400 transition-colors ml-0.5"><X size={10} /></button>
                </span>
              ))}
            </div>
            {form.tags.length < 5 && (
              <div className="flex gap-2">
                <input ref={tagInputRef} value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Ex: medicina, direito…" className={`${inputCls} flex-1`} />
                <button type="button" onClick={addTag}
                  className="px-4 py-3 rounded-xl bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-all text-sm font-medium flex-shrink-0">
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Cor */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Cor</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${form.color === c ? 'ring-2 ring-white/50 scale-110' : 'opacity-50 hover:opacity-90'}`}>
                  {form.color === c && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Configurações de revisão */}
          <div className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Bell size={14} className={form.reviewSettings.notify ? 'text-blue-400' : 'text-slate-600'} />
                <p className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Revisão</p>
                {form.reviewSettings.notify && (
                  <div className="flex gap-1">
                    {[1, 7, 14].map((d) => (
                      <button key={d} type="button"
                        onClick={() => setForm((f) => ({ ...f, reviewSettings: { ...f.reviewSettings, newCardDelay: d } }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          form.reviewSettings.newCardDelay === d
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : isDark ? 'border-white/8 text-slate-500 hover:border-white/15' : 'border-black/8 text-slate-500 hover:border-black/15'
                        }`}>
                        {d === 1 ? '1d' : `${d}d`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button"
                onClick={() => setForm((f) => ({ ...f, reviewSettings: { ...f.reviewSettings, notify: !f.reviewSettings.notify } }))}
                className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${form.reviewSettings.notify ? 'bg-blue-600' : isDark ? 'bg-white/10' : 'bg-black/15'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.reviewSettings.notify ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={17} className="animate-spin" /> Salvando...</> : editing ? <><Check size={17} /> Salvar alterações</> : <><Plus size={17} /> Criar deck</>}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding (primeiro acesso) ─────────────────────────────────────────────
function OnboardingModal({ onClose, onCreateFirst }) {
  const { isDark } = useTheme ? useTheme() : { isDark: true };
  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0F0F18] rounded-3xl border border-white/10 p-8 text-center">
        <div className="text-5xl mb-4">🧠</div>
        <h2 className="text-white font-bold text-xl mb-2">Bem-vindo ao FlashMind!</h2>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Organize seu estudo com flashcards inteligentes.<br />
          Crie seu primeiro deck para começar.
        </p>
        <div className="space-y-3">
          <button onClick={onCreateFirst}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
            <Sparkles size={16} /> Criar meu primeiro deck
          </button>
          <button onClick={onClose} className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors">
            Explorar primeiro
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast    = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Estado principal
  const [decks, setDecks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState({ decksStudiedToday: 0, accuracy: null, dueTotal: 0, cardsStudiedToday: 0 });
  const [dailyGoal, setDailyGoal]   = useState(() => parseInt(localStorage.getItem('fm_daily_goal') || '0', 10));
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput]   = useState('');
  const [streak, setStreak]         = useState(0);

  // Modais
  const [showModal, setShowModal]         = useState(false);
  const [editing, setEditing]             = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [confirmReset, setConfirmReset]   = useState(false);
  const [resetting, setResetting]         = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Filtros e ordenação
  const [sortBy, setSortBy]         = useState('recent');
  const [showSort, setShowSort]     = useState(false);
  const [activeTag, setActiveTag]   = useState(null); // tag ativa para filtrar

  // Drag-and-drop
  const [studyQueue, setStudyQueue]       = useState([]);
  const [queueOpen, setQueueOpen]         = useState(false);
  const [draggingId, setDraggingId]       = useState(null);
  const [dragOverQueue, setDragOverQueue] = useState(false);

  useEffect(() => {
    api.get('/decks')
      .then((res) => {
        setDecks(res.data);
        // Onboarding: só mostra uma vez, quando não há decks e nunca foi visto
        if (res.data.length === 0 && !localStorage.getItem('fm_onboarding_seen')) {
          setShowOnboarding(true);
          localStorage.setItem('fm_onboarding_seen', '1');
        }
      })
      .catch(() => toast('Erro ao carregar decks.', 'error'))
      .finally(() => setLoading(false));

    api.get('/study/stats').then((res) => setStats(res.data)).catch(() => {});
    api.get('/study/history?days=7').then((res) => setStreak(res.data.streak || 0)).catch(() => {});
  }, []);

  // Tema automático (só na primeira visita)
  useEffect(() => {
    if (!localStorage.getItem('fm_theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  }, []);

  // Todas as tags disponíveis
  const allTags = [...new Set(decks.flatMap((d) => d.tags || []))].sort();

  // Decks filtrados e ordenados
  const filteredDecks = sortDecks(
    activeTag ? decks.filter((d) => (d.tags || []).includes(activeTag)) : decks,
    sortBy
  );

  const handleSaved = async (deck, isEdit) => {
    // Sempre recarrega a lista completa para garantir campos atualizados
    try {
      const res = await api.get('/decks');
      setDecks(res.data);
    } catch {
      // Fallback local
      if (isEdit) {
        setDecks((prev) => prev.map((d) => (d._id === deck._id ? { ...d, ...deck } : d)));
      } else {
        setDecks((prev) => [{ ...deck, flashcardCount: 0 }, ...prev]);
      }
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/decks/${confirmDelete._id}`);
      setDecks((prev) => prev.filter((d) => d._id !== confirmDelete._id));
      toast('Deck excluído.', 'info');
    } catch { toast('Erro ao excluir deck.', 'error'); }
    finally { setDeleting(false); setConfirmDelete(null); }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.delete('/study/reset');
      setStats({ decksStudiedToday: 0, accuracy: null });
      toast('Histórico resetado com sucesso.', 'info');
    } catch { toast('Erro ao resetar histórico.', 'error'); }
    finally { setResetting(false); setConfirmReset(false); }
  };

  const handleFavoriteDeck = async (deckId) => {
    try {
      const res = await api.patch(`/decks/${deckId}/favorite`);
      setDecks((prev) => prev.map((d) => (d._id === deckId ? { ...d, isFavorite: res.data.isFavorite } : d)));
      toast(res.data.isFavorite ? 'Deck favoritado ⭐' : 'Removido dos favoritos', 'info');
    } catch { toast('Erro ao favoritar deck.', 'error'); }
  };

  const handleClone = async (deck) => {
    try {
      const res = await api.post(`/decks/${deck._id}/clone`);
      setDecks((prev) => [res.data, ...prev]);
      toast(`"${deck.name}" duplicado!`, 'success');
    } catch { toast('Erro ao duplicar deck.', 'error'); }
  };

  // Drag helpers
  const handleDragStart = (e, deckId) => { setDraggingId(deckId); e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', deckId); };
  const handleDragEnd   = () => setDraggingId(null);
  const handleQueueDrop = (e) => {
    e.preventDefault(); setDragOverQueue(false);
    const id = e.dataTransfer.getData('text/plain');
    if (id && !studyQueue.includes(id)) { setStudyQueue((prev) => [...prev, id]); setQueueOpen(true); }
  };
  const removeFromQueue = (id) => setStudyQueue((prev) => prev.filter((d) => d !== id));

  const handleStudyQueue = async () => {
    if (studyQueue.length === 0) return;
    toast('Carregando cards...', 'info');
    try {
      const results = await Promise.all(studyQueue.map((id) => api.get(`/flashcards/deck/${id}`)));
      const allCards = results.flatMap((r) => r.data);
      if (allCards.length === 0) { toast('Nenhum card encontrado.', 'error'); return; }
      const names = decks.filter((d) => studyQueue.includes(d._id)).map((d) => d.name);
      navigate('/study/custom', { state: { cards: allCards, title: names.length <= 2 ? names.join(' + ') : `${names.length} decks` } });
    } catch { toast('Erro ao carregar cards.', 'error'); }
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };
  const firstName = user?.name?.split(' ')[0] || '';
  const SortIcon = SORT_OPTIONS.find((s) => s.value === sortBy)?.icon || SortAsc;

  // Badge de cards vencidos total
  const totalDue = decks.reduce((a, d) => (d.reviewSettings?.notify !== false ? a + (d.dueCount || 0) : a), 0);

  return (
    <div className={`min-h-screen text-slate-200 ${isDark ? 'bg-[#0A0A0F]' : 'bg-[#F0F2F8]'}`}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <Navbar />

      {/* Onboarding */}
      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onCreateFirst={() => { setShowOnboarding(false); setShowModal(true); }}
        />
      )}

      {/* Modal criar/editar */}
      {showModal && <DeckModal onClose={closeModal} onSaved={handleSaved} editing={editing} toast={toast} />}

      {/* Modal confirmar reset */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass rounded-3xl border border-white/10 p-8 text-center">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-white font-bold text-lg mb-2">Resetar histórico?</h3>
            <p className="text-slate-500 text-sm mb-8">A taxa de acerto e os dados de estudo serão apagados permanentemente. Os seus decks e flashcards continuam intactos.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmReset(false)} disabled={resetting}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-50">Cancelar</button>
              <button onClick={handleReset} disabled={resetting}
                className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {resetting ? <><Loader2 size={15} className="animate-spin" /> Resetando...</> : 'Resetar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass rounded-3xl border border-white/10 p-8 text-center">
            <div className="text-4xl mb-4">🗑️</div>
            <h3 className="text-white font-bold text-lg mb-2">Excluir deck?</h3>
            <p className="text-slate-500 text-sm mb-8">O deck <span className="text-white font-medium">"{confirmDelete.name}"</span> e todos os seus flashcards serão removidos permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-50">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 font-semibold py-3 rounded-xl transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting ? <><Loader2 size={15} className="animate-spin" /> Excluindo...</> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-16 relative z-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-slate-500 text-sm mb-1">Olá, {firstName} 👋</p>
            <h1 className="text-3xl font-bold text-white tracking-tight">Seus decks</h1>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => { setEditing(null); setShowModal(true); }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)] flex items-center gap-2 group text-sm">
              <Plus size={17} className="group-hover:rotate-90 transition-transform duration-200" /> Criar deck
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Decks',         value: decks.length,                                           icon: LayoutGrid, color: 'text-blue-400'   },
            { label: 'Flashcards',    value: decks.reduce((a, d) => a + (d.flashcardCount || 0), 0), icon: Book,        color: 'text-indigo-400' },
            { label: 'Estudados hoje',value: stats.decksStudiedToday || 0,                           icon: Play,        color: 'text-emerald-400'},
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass rounded-2xl border border-white/5 p-5 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/5 ${color}`}><Icon size={17} /></div>
              <div>
                <p className="text-white font-bold text-lg leading-none">{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            </div>
          ))}

          {/* Streak */}
          <div className="glass rounded-2xl border border-white/5 p-5 flex items-center gap-3 group/stat relative cursor-pointer" onClick={() => navigate('/stats')}>
            <div className={`p-2 rounded-lg bg-white/5 flex-shrink-0 ${streak > 0 ? 'text-orange-400' : 'text-slate-500'}`}>
              <Flame size={17} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-lg leading-none ${streak > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{streak}</p>
              <p className="text-slate-500 text-xs mt-0.5">Dias seguidos</p>
            </div>
          </div>
        </div>

        {/* Meta diária */}
        {(dailyGoal > 0 || editingGoal) ? (
          <div className="glass rounded-2xl border border-white/5 p-5 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">🎯 Meta diária</span>
                {dailyGoal > 0 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    stats.cardsStudiedToday >= dailyGoal
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/5 text-slate-400'
                  }`}>
                    {stats.cardsStudiedToday >= dailyGoal ? '✓ Concluída!' : `${stats.cardsStudiedToday}/${dailyGoal} cards`}
                  </span>
                )}
              </div>
              {editingGoal ? (
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="500" placeholder="Ex: 20"
                    value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                    className="w-20 bg-white/5 border border-white/10 text-white text-sm px-2 py-1 rounded-lg outline-none focus:border-blue-500/50"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const v = parseInt(goalInput, 10);
                        if (v > 0) { setDailyGoal(v); localStorage.setItem('fm_daily_goal', v); }
                        setEditingGoal(false);
                      }
                      if (e.key === 'Escape') setEditingGoal(false);
                    }} />
                  <button onClick={() => {
                    const v = parseInt(goalInput, 10);
                    if (v > 0) { setDailyGoal(v); localStorage.setItem('fm_daily_goal', v); }
                    setEditingGoal(false);
                  }} className="text-xs text-blue-400 hover:text-blue-300 font-medium">Salvar</button>
                  <button onClick={() => { if (!dailyGoal) { setDailyGoal(0); localStorage.removeItem('fm_daily_goal'); } setEditingGoal(false); }}
                    className="text-xs text-slate-500 hover:text-slate-300">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => { setGoalInput(String(dailyGoal)); setEditingGoal(true); }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Editar meta</button>
              )}
            </div>
            {dailyGoal > 0 && (
              <>
                <div className={`w-full h-2 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/8'}`}>
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    stats.cardsStudiedToday >= dailyGoal ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} style={{ width: `${Math.min(100, Math.round((stats.cardsStudiedToday / dailyGoal) * 100))}%` }} />
                </div>
                <p className="text-slate-600 text-xs mt-2">
                  {stats.cardsStudiedToday >= dailyGoal
                    ? 'Meta atingida! Continue assim 🎉'
                    : `Faltam ${dailyGoal - stats.cardsStudiedToday} cards para bater a meta`}
                </p>
              </>
            )}
          </div>
        ) : (
          <button onClick={() => { setGoalInput(''); setEditingGoal(true); setDailyGoal(1); }}
            className={`flex items-center gap-2 text-xs mb-8 transition-colors ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'}`}>
            <span className="text-base">🎯</span> Definir meta diária de cards
          </button>
        )}
        {decks.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {/* Notificação cards vencidos */}
            {totalDue > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                <RotateCcw size={12} />
                {totalDue} card{totalDue > 1 ? 's' : ''} para revisar hoje
              </div>
            )}

            {/* Filtro por tag */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setActiveTag(null)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                    !activeTag ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : isDark ? 'text-slate-500 border-white/8 hover:border-white/15' : 'text-slate-500 border-black/8 hover:border-black/15'
                  }`}
                >
                  <Tag size={11} /> Todos
                </button>
                {allTags.map((t) => (
                  <button key={t}
                    onClick={() => setActiveTag(activeTag === t ? null : t)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      activeTag === t ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : isDark ? 'text-slate-500 border-white/8 hover:border-white/15' : 'text-slate-500 border-black/8 hover:border-black/15'
                    }`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            )}

            {/* Ordenação */}
            <div className="ml-auto relative">
              <button
                onClick={() => setShowSort((v) => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isDark ? 'text-slate-400 border-white/8 hover:border-white/15' : 'text-slate-500 border-black/8 hover:border-black/15'
                }`}
              >
                <SortIcon size={12} />
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                <ChevronDown size={11} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
              </button>
              {showSort && (
                <div className={`absolute right-0 top-full mt-1 w-44 rounded-2xl border shadow-xl overflow-hidden z-30 ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
                  {SORT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSort(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium transition-colors ${
                          sortBy === opt.value ? 'text-blue-400 bg-blue-500/10' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-black/4'
                        }`}>
                        <Icon size={13} /> {opt.label}
                        {sortBy === opt.value && <Check size={11} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grid de decks */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-52 glass rounded-2xl animate-pulse border border-white/5" />)}
          </div>
        ) : filteredDecks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDecks.map((deck) => (
              <div key={deck._id}
                className={`glass rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative flex flex-col justify-between p-6 h-auto min-h-[13rem] ${draggingId === deck._id ? 'opacity-50 scale-95' : ''} ${studyQueue.includes(deck._id) ? 'ring-1 ring-blue-500/30' : ''}`}
              >
                {/* Glow */}
                <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity pointer-events-none" style={{ backgroundColor: deck.color || '#4F8EF7' }} />

                {/* Área clicável */}
                <div className="absolute inset-0 rounded-2xl cursor-pointer z-0" onClick={() => navigate(`/deck/${deck._id}`)} />

                {/* Drag handle */}
                <div draggable onDragStart={(e) => handleDragStart(e, deck._id)} onDragEnd={handleDragEnd} onClick={(e) => e.stopPropagation()}
                  title="Arraste para a fila" className="absolute top-3 left-3 z-20 p-1.5 rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-400 hover:bg-blue-500/10">
                  <GripVertical size={14} />
                </div>

                {/* Badge na fila */}
                {studyQueue.includes(deck._id) && (
                  <div className="absolute top-3 right-12 z-20 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center pointer-events-none">
                    <span className="text-white text-[9px] font-bold">{studyQueue.indexOf(deck._id) + 1}</span>
                  </div>
                )}

                {/* Topo */}
                <div className="relative z-10 flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {deck.deckImage
                      ? <img src={deck.deckImage} alt={deck.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      : <span className="text-2xl flex-shrink-0">{deck.emoji || '📚'}</span>}
                    <div className="min-w-0">
                      <h3 className="text-white font-semibold text-base leading-tight group-hover:text-blue-300 transition-colors truncate">{deck.name}</h3>
                      {deck.description && <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{deck.description}</p>}
                      {/* Tags */}
                      {(deck.tags || []).length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {deck.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400/70 font-medium">#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                    <button onClick={() => handleFavoriteDeck(deck._id)}
                      className={`p-2 rounded-lg transition-all ${deck.isFavorite ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}>
                      <Star size={14} fill={deck.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button onClick={() => handleClone(deck)} title="Duplicar deck"
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                      <Copy size={14} />
                    </button>
                    <button onClick={() => { setEditing(deck); setShowModal(true); }}
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setConfirmDelete(deck)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {deck.flashcardCount > 0 && (
                      <div className="mb-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-600 text-[10px]">{deck.masteredCount || 0}/{deck.flashcardCount} dominados</span>
                          {deck.dueCount > 0 && deck.reviewSettings?.notify !== false && <span className="text-[10px] font-semibold text-amber-400">{deck.dueCount} para revisar</span>}
                        </div>
                        <div className={`h-1 rounded-full w-full ${isDark ? 'bg-white/8' : 'bg-black/8'}`}>
                          <div className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.round(((deck.masteredCount || 0) / deck.flashcardCount) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                      <Book size={11} />
                      <span>{deck.flashcardCount || 0} cards</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {deck.dueCount > 0 && deck.reviewSettings?.notify !== false && (
                      <button onClick={() => navigate(`/study/${deck._id}?mode=due`)} title="Revisar cards vencidos"
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-lg transition-all text-amber-400 bg-amber-500/10 hover:bg-amber-500/20">
                        <RotateCcw size={11} />
                      </button>
                    )}
                    <button onClick={() => navigate(`/study/${deck._id}`)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                      style={{ backgroundColor: `${deck.color || '#4F8EF7'}18`, color: deck.color || '#4F8EF7' }}>
                      <Play size={12} fill="currentColor" /> Estudar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className={`p-6 rounded-3xl mb-6 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
                <BrainCircuit size={40} className="text-slate-500" />
              </div>
              <h3 className="text-white font-semibold text-xl mb-2">Nenhum deck ainda</h3>
              <p className="text-slate-500 text-sm mb-8 max-w-xs leading-relaxed">
                Crie seu primeiro deck e comece a transformar suas anotações em memória duradoura.
              </p>
              <button onClick={() => setShowModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                <Plus size={16} /> Criar primeiro deck
              </button>
            </div>
          ) : (
            /* Nenhum resultado para a tag ativa */
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
                <Tag size={32} className="text-slate-500" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">Nenhum deck com a tag #{activeTag}</h3>
              <button onClick={() => setActiveTag(null)} className="text-blue-400 text-sm hover:underline mt-1">Ver todos os decks</button>
            </div>
          )
        )}
      </main>

      {/* Zona de drop */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ${draggingId ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOverQueue(true); }}
        onDragLeave={() => setDragOverQueue(false)}
        onDrop={handleQueueDrop}
      >
        <div className={`mx-4 mb-4 px-6 py-4 rounded-2xl border-2 border-dashed transition-all text-center ${dragOverQueue ? 'border-blue-400 bg-blue-500/15' : isDark ? 'border-white/20 bg-[#0A0A0F]/90' : 'border-black/15 bg-white/90'}`}>
          <p className={`text-sm font-semibold flex items-center justify-center gap-2 ${dragOverQueue ? 'text-blue-400' : 'text-slate-500'}`}>
            <ListOrdered size={16} />
            {dragOverQueue ? 'Solte para adicionar à fila' : 'Solte aqui para adicionar à fila de estudo'}
          </p>
        </div>
      </div>

      {/* Painel da fila */}
      {studyQueue.length > 0 && (
        <div className={`fixed bottom-4 right-4 z-50 w-72 rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-white/8' : 'border-black/6'}`}>
            <div className="flex items-center gap-2">
              <ListOrdered size={15} className="text-blue-400" />
              <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Fila de estudo</span>
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">{studyQueue.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setQueueOpen((v) => !v)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
                <ChevronUp size={14} className={`transition-transform ${queueOpen ? '' : 'rotate-180'}`} />
              </button>
              <button onClick={() => setStudyQueue([])} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Limpar fila">
                <X size={14} />
              </button>
            </div>
          </div>
          {queueOpen && (
            <div className="max-h-48 overflow-y-auto">
              {studyQueue.map((id, i) => {
                const d = decks.find((dk) => dk._id === id);
                if (!d) return null;
                return (
                  <div key={id} className={`flex items-center gap-2.5 px-4 py-2.5 border-b last:border-b-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                    <span className={`text-xs font-bold w-4 text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>{i + 1}</span>
                    {d.deckImage ? <img src={d.deckImage} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" /> : <span className="text-base flex-shrink-0">{d.emoji || '📚'}</span>}
                    <span className={`text-sm truncate flex-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{d.name}</span>
                    <button onClick={() => removeFromQueue(id)} className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"><X size={12} /></button>
                  </div>
                );
              })}
            </div>
          )}
          <div className={`px-4 py-3 ${isDark ? 'border-t border-white/8' : 'border-t border-black/6'}`}>
            <button onClick={handleStudyQueue}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-all">
              <BookOpen size={14} /> Estudar {studyQueue.length} deck{studyQueue.length > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}