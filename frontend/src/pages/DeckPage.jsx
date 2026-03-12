import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import FlashCard from '../components/FlashCard';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import {
  Plus, ArrowLeft, Loader2, X, BookOpen, Image, Link, Upload,
  Trash2 as TrashIcon, Download, FileUp, Search, History,
  CheckCircle2, XCircle, Clock, LayoutGrid, MoreVertical, Copy,
} from 'lucide-react';
import CsvImportModal from '../components/CsvImportModal';
import AudioPicker from '../components/AudioPicker';

// ─── ImagePicker ──────────────────────────────────────────────────────────────
function ImagePicker({ value, onChange, label }) {
  const [mode, setMode] = useState(value ? (value.startsWith('data:') ? 'upload' : 'url') : 'url');
  const [urlInput, setUrlInput] = useState(value && !value.startsWith('data:') ? value : '');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Imagem muito grande. Use uma imagem menor que 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  };

  const clear = () => { setUrlInput(''); onChange(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
        <div className="flex gap-1">
          <button type="button" onClick={() => setMode('url')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${mode === 'url' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Link size={11} /> URL
          </button>
          <button type="button" onClick={() => setMode('upload')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${mode === 'upload' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}>
            <Upload size={11} /> Upload
          </button>
        </div>
      </div>
      {value && (
        <div className="relative mb-2 rounded-xl overflow-hidden border border-white/10 bg-white/4">
          <img src={value} alt="preview" className="w-full max-h-32 object-contain" />
          <button type="button" onClick={clear} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-red-400 hover:bg-black/80 transition-all">
            <TrashIcon size={12} />
          </button>
        </div>
      )}
      {mode === 'url' ? (
        <input type="url" placeholder="https://exemplo.com/imagem.jpg" value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)} onBlur={() => onChange(urlInput.trim() || null)}
          className="w-full bg-white/4 border border-white/8 focus:border-blue-500/50 px-3 py-2.5 rounded-xl outline-none text-white placeholder-slate-600 text-sm transition-all" />
      ) : (
        <div onClick={() => fileRef.current?.click()}
          className="w-full border border-dashed border-white/15 hover:border-blue-500/40 rounded-xl px-4 py-4 flex flex-col items-center gap-2 cursor-pointer transition-all group">
          <Image size={20} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
          <span className="text-slate-500 text-xs">Clique para escolher uma imagem</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      )}
    </div>
  );
}

// ─── CardModal (criar/editar) — com campo notas ───────────────────────────────
function CardModal({ onClose, onSaved, deckId, editing, toast, isDark }) {
  const [form, setForm] = useState({
    front:      editing?.front      || '',
    back:       editing?.back       || '',
    frontImage: editing?.frontImage || null,
    backImage:  editing?.backImage  || null,
    frontAudio: editing?.frontAudio || null,
    backAudio:  editing?.backAudio  || null,
    notes:      editing?.notes      || '',
  });
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showNotes, setShowNotes] = useState(!!(editing?.notes));

  // Garante que o form reflete o card sendo editado (inclui áudio)
  useEffect(() => {
    if (editing) {
      setForm({
        front:      editing.front      || '',
        back:       editing.back       || '',
        frontImage: editing.frontImage || null,
        backImage:  editing.backImage  || null,
        frontAudio: editing.frontAudio || null,
        backAudio:  editing.backAudio  || null,
        notes:      editing.notes      || '',
      });
      setShowNotes(!!(editing.notes));
    }
  }, [editing?._id]);

  const charCount = (str) => str.trim().length;
  const wordCount = (str) => str.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frente: precisa de texto OU imagem OU áudio
    const frontOk = form.front.trim() || form.frontImage || form.frontAudio;
    // Verso: precisa de texto OU imagem OU áudio
    const backOk  = form.back.trim()  || form.backImage  || form.backAudio;

    if (!frontOk || !backOk) {
      setError(
        !frontOk && !backOk
          ? 'Adicione conteúdo na pergunta e na resposta (texto, imagem ou áudio).'
          : !frontOk
          ? 'A pergunta precisa de texto, imagem ou áudio.'
          : 'A resposta precisa de texto, imagem ou áudio.'
      );
      return;
    }

    setLoading(true);

    try {
      let res;
      if (editing) {
        res = await api.put(`/flashcards/${editing._id}`, form);
        toast('Card atualizado!', 'success');
      } else {
        res = await api.post('/flashcards', { ...form, deckId });
        toast('Flashcard criado!', 'success');
      }
      onSaved(res.data, !!editing);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erro ao salvar card.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass rounded-3xl border border-white/10 flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header fixo */}
        <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-white/8 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">{editing ? 'Editar card' : 'Novo flashcard'}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{editing ? 'Atualize o conteúdo do card.' : 'Adicione texto e/ou imagem em cada lado.'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors flex-shrink-0"><X size={20} /></button>
        </div>
        {/* Corpo com scroll interno */}
        <div className="overflow-y-auto flex-1 px-8 py-6">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Frente */}
          <div className="space-y-3 p-4 rounded-2xl border border-white/6 bg-white/2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Frente</p>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Pergunta</label>
                <span className="text-[10px] text-slate-600">{wordCount(form.front)} palavras · {charCount(form.front)} chars</span>
              </div>
              <textarea rows={2} placeholder="O que você quer memorizar?"
                className="w-full bg-white/4 border border-white/8 focus:border-blue-500/50 px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm resize-none"
                value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })} />
            </div>
            <ImagePicker label="Imagem (opcional)" value={form.frontImage} onChange={(v) => setForm({ ...form, frontImage: v })} />
            <AudioPicker label="Áudio (opcional)" value={form.frontAudio} onChange={(v) => setForm({ ...form, frontAudio: v })} />
          </div>

          {/* Verso */}
          <div className="space-y-3 p-4 rounded-2xl border border-blue-500/10 bg-blue-500/2">
            <p className="text-xs font-bold text-blue-500/50 uppercase tracking-widest">Verso</p>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Resposta</label>
                <span className="text-[10px] text-slate-600">{wordCount(form.back)} palavras · {charCount(form.back)} chars</span>
              </div>
              <textarea rows={2} placeholder="A resposta que deve aparecer ao virar."
                className="w-full bg-white/4 border border-white/8 focus:border-blue-500/50 px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm resize-none"
                value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })} />
            </div>
            <ImagePicker label="Imagem (opcional)" value={form.backImage} onChange={(v) => setForm({ ...form, backImage: v })} />
            <AudioPicker label="Áudio (opcional)" value={form.backAudio} onChange={(v) => setForm({ ...form, backAudio: v })} />
          </div>

          {/* Anotações */}
          <div>
            <button type="button" onClick={() => setShowNotes((v) => !v)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-2">
              <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all text-[10px] ${showNotes ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-white/15'}`}>
                {showNotes ? '✓' : '+'}
              </span>
              Anotação pessoal {showNotes ? '(visível só para você)' : ''}
            </button>
            {showNotes && (
              <textarea rows={3} placeholder="Dicas, contexto extra, macetes para lembrar..."
                className="w-full bg-amber-500/5 border border-amber-500/15 focus:border-amber-500/40 px-4 py-3 rounded-xl outline-none transition-all text-slate-300 placeholder-slate-600 text-sm resize-none"
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={17} className="animate-spin" /> Salvando...</> : <><Plus size={17} /> {editing ? 'Salvar alterações' : 'Adicionar card'}</>}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}

// ─── Aba Histórico ─────────────────────────────────────────────────────────────
function HistoryTab({ deckId, isDark }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get(`/study/deck/${deckId}/history`)
      .then((r) => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deckId]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-600" /></div>;

  if (sessions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-white/4 text-slate-600' : 'bg-black/4 text-slate-400'}`}><History size={28} /></div>
      <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>Nenhuma sessão ainda</p>
      <p className="text-slate-500 text-sm mt-1">Estude este deck para ver seu histórico aqui.</p>
    </div>
  );

  const fmt = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-3">
      {sessions.map((s) => {
        const pct = s.totalCards > 0 ? Math.round((s.correct / s.totalCards) * 100) : 0;
        const color = pct >= 70 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400';
        const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
        return (
          <div key={s._id} className={`rounded-2xl border p-4 ${isDark ? 'glass border-white/8' : 'bg-white border-black/8 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Clock size={12} /> {fmt(s.createdAt)}
              </div>
              <span className={`text-sm font-bold ${color}`}>{pct}%</span>
            </div>
            <div className={`w-full h-1.5 rounded-full mb-3 ${isDark ? 'bg-white/8' : 'bg-black/8'}`}>
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} /> {s.correct} acertos</span>
              <span className="flex items-center gap-1 text-red-400"><XCircle size={12} /> {s.wrong} erros</span>
              <span className="text-slate-500 ml-auto">{s.totalCards} cards</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── DeckPage ──────────────────────────────────────────────────────────────────
export default function DeckPage() {
  const { deckId }   = useParams();
  const navigate     = useNavigate();
  const toast        = useToast();
  const { theme }    = useTheme();
  const isDark       = theme === 'dark';

  const [deck, setDeck]       = useState(null);
  const [cards, setCards]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab]   = useState('cards'); // 'cards' | 'history'
  const [search, setSearch]         = useState('');
  const [showDeckMenu, setShowDeckMenu] = useState(false);
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(false);
  const deckMenuRef = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        const [deckRes, cardsRes] = await Promise.all([api.get(`/decks/${deckId}`), api.get(`/flashcards/deck/${deckId}`)]);
        setDeck(deckRes.data);
        setCards(cardsRes.data);
      } catch { toast('Erro ao carregar o deck.', 'error'); }
      finally { setLoading(false); }
    };
    load();
  }, [deckId]);

  const handleSaved = (card, isEdit) => {
    if (isEdit) setCards((prev) => prev.map((c) => (c._id === card._id ? card : c)));
    else setCards((prev) => [card, ...prev]);
  };

  const handleDelete = async () => {
    if (!confirmDeleteCard) return;
    try {
      await api.delete(`/flashcards/${confirmDeleteCard._id}`);
      setCards((prev) => prev.filter((c) => c._id !== confirmDeleteCard._id));
      toast('Flashcard excluído.', 'info');
    } catch { toast('Erro ao excluir card.', 'error'); }
    finally { setConfirmDeleteCard(null); }
  };

  const handleFavorite = async (card) => {
    try {
      const res = await api.patch(`/flashcards/${card._id}/favorite`);
      setCards((prev) => prev.map((c) => (c._id === card._id ? res.data : c)));
      toast(res.data.isFavorite ? 'Adicionado aos favoritos ⭐' : 'Removido dos favoritos', 'info');
    } catch { toast('Erro ao favoritar.', 'error'); }
  };

  const handleDuplicateCard = async (card) => {
    try {
      const res = await api.post('/flashcards', {
        deckId,
        front: card.front + ' (cópia)',
        back: card.back,
        frontImage: card.frontImage || null,
        backImage:  card.backImage  || null,
        frontAudio: card.frontAudio || null,
        backAudio:  card.backAudio  || null,
        notes: card.notes || '',
      });
      setCards((prev) => [res.data, ...prev]);
      toast('Card duplicado!', 'success');
    } catch { toast('Erro ao duplicar card.', 'error'); }
  };

  const handleDeleteDeck = async () => {
    try {
      await api.delete(`/decks/${deckId}`);
      toast('Deck excluído.', 'info');
      navigate('/dashboard');
    } catch { toast('Erro ao excluir deck.', 'error'); }
  };

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handler = (e) => { if (deckMenuRef.current && !deckMenuRef.current.contains(e.target)) setShowDeckMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exportCsv = () => {
    if (cards.length === 0) { toast('Nenhum card para exportar.', 'error'); return; }
    const rows = cards.map((c) => `"${(c.front||'').replace(/"/g,'""')}","${(c.back||'').replace(/"/g,'""')}"`);
    const bom = '\uFEFF';
    const csv = bom + ['frente,verso', ...rows].join('\r\n');
    const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `${deck?.name||'deck'}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast(`${cards.length} cards exportados!`, 'success');
  };

  const handleImported = () => {
    api.get(`/flashcards/deck/${deckId}`).then((r) => setCards(r.data)).catch(() => {});
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  // Filtro de busca
  const filtered = search.trim()
    ? cards.filter((c) =>
        c.front.toLowerCase().includes(search.toLowerCase()) ||
        c.back.toLowerCase().includes(search.toLowerCase()) ||
        (c.notes || '').toLowerCase().includes(search.toLowerCase())
      )
    : cards;

  return (
    <div className="min-h-screen text-slate-200" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <Navbar />

      {showModal && <CardModal onClose={closeModal} onSaved={handleSaved} deckId={deckId} editing={editing} toast={toast} isDark={isDark} />}
      {showImport && <CsvImportModal deckId={deckId} deckName={deck?.name||''} onClose={() => setShowImport(false)} onImported={handleImported} />}

      {confirmDeleteDeck && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass rounded-3xl border border-white/10 p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-white font-bold text-lg mb-2">Excluir deck?</h3>
            <p className="text-slate-500 text-sm mb-8">
              O deck <span className="text-white font-medium">"{deck?.name}"</span> e todos os seus {cards.length} card{cards.length !== 1 ? 's' : ''} serão removidos permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteDeck(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 font-semibold py-3 rounded-xl transition-all text-sm">Cancelar</button>
              <button onClick={handleDeleteDeck}
                className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 font-semibold py-3 rounded-xl transition-all text-sm">Excluir tudo</button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass rounded-3xl border border-white/10 p-8 text-center">
            <div className="text-4xl mb-4">🗑️</div>
            <h3 className="text-white font-bold text-lg mb-2">Excluir flashcard?</h3>
            <p className="text-slate-500 text-sm mb-8">
              O card <span className="text-white font-medium">"{confirmDeleteCard.front.length > 40 ? confirmDeleteCard.front.slice(0,40) + '...' : confirmDeleteCard.front}"</span> será removido permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteCard(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 font-semibold py-3 rounded-xl transition-all text-sm">Cancelar</button>
              <button onClick={handleDelete}
                className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 text-red-400 font-semibold py-3 rounded-xl transition-all text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-16 relative z-10">
        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-white text-sm mb-8 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar aos decks
        </button>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-600" /></div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
              <div className="flex items-center gap-4">
                {deck?.deckImage
                  ? <img src={deck.deckImage} alt={deck.name} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" />
                  : <span className="text-4xl">{deck?.emoji || '📚'}</span>
                }
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">{deck?.name}</h1>
                  {deck?.description && <p className="text-slate-500 text-sm mt-1">{deck.description}</p>}
                  <p className="text-slate-600 text-xs mt-1">{cards.length} cards</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {/* Menu hambúrguer do deck */}
                <div className="relative" ref={deckMenuRef}>
                  <button onClick={() => setShowDeckMenu((v) => !v)}
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-xl transition-all border ${isDark ? 'text-slate-400 border-white/8 hover:border-white/15 hover:text-white' : 'text-slate-500 border-black/8 hover:border-black/15'}`}>
                    <MoreVertical size={15} />
                  </button>
                  {showDeckMenu && (
                    <div className={`absolute right-0 top-full mt-2 w-48 rounded-2xl border shadow-xl z-30 overflow-hidden ${isDark ? 'glass border-white/10 bg-slate-900/95' : 'bg-white border-black/8'}`}>
                      {cards.length > 0 && (
                        <button onClick={() => { exportCsv(); setShowDeckMenu(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-all ${isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-700 hover:bg-black/4'}`}>
                          <Download size={14} className="text-slate-500" /> Exportar CSV
                        </button>
                      )}
                      <button onClick={() => { setShowImport(true); setShowDeckMenu(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-all ${isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-700 hover:bg-black/4'}`}>
                        <FileUp size={14} className="text-slate-500" /> Importar CSV
                      </button>
                      <div className={`h-px mx-3 ${isDark ? 'bg-white/8' : 'bg-black/6'}`} />
                      <button onClick={() => { setConfirmDeleteDeck(true); setShowDeckMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-all">
                        <TrashIcon size={14} /> Excluir deck
                      </button>
                    </div>
                  )}
                </div>

                <button onClick={() => { setEditing(null); setShowModal(true); }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex items-center gap-2 group">
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" /> Novo card
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className={`flex items-center gap-1 p-1 rounded-xl w-fit mb-6 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              {[
                { id: 'cards',   icon: <LayoutGrid size={14} />, label: 'Cards' },
                { id: 'history', icon: <History size={14} />,    label: 'Histórico' },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Aba Cards */}
            {activeTab === 'cards' && (
              <>
                {/* Busca */}
                {cards.length > 0 && (
                  <div className="relative mb-6 max-w-sm">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                      type="text" placeholder="Buscar cards..." value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${
                        isDark
                          ? 'bg-white/4 border-white/8 focus:border-blue-500/40 text-white placeholder-slate-600'
                          : 'bg-black/3 border-black/8 focus:border-blue-500/40 text-slate-800 placeholder-slate-400'
                      }`}
                    />
                    {search && (
                      <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )}

                {filtered.length > 0 ? (
                  <>
                    {search && (
                      <p className="text-slate-500 text-xs mb-4">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para "{search}"</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map((card) => (
                        <FlashCard key={card._id} card={card}
                          onFavorite={handleFavorite}
                          onEdit={(c) => { setEditing(c); setShowModal(true); }}
                          onDuplicate={handleDuplicateCard}
                          onDelete={(c) => setConfirmDeleteCard(c)} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    {search ? (
                      <>
                        <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4 text-slate-600' : 'bg-black/4 text-slate-400'}`}><Search size={36} /></div>
                        <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Nenhum resultado</h3>
                        <p className="text-slate-500 text-sm mb-4">Nenhum card corresponde a "{search}".</p>
                        <button onClick={() => setSearch('')} className="text-blue-400 text-sm hover:underline">Limpar busca</button>
                      </>
                    ) : (
                      <>
                        <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4 text-slate-600' : 'bg-black/4 text-slate-400'}`}><BookOpen size={36} /></div>
                        <h3 className={`font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Deck vazio</h3>
                        <p className="text-slate-500 text-sm mb-8 max-w-xs">Adicione seu primeiro flashcard para começar a estudar.</p>
                        <button onClick={() => setShowModal(true)}
                          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 text-sm">
                          <Plus size={16} /> Criar primeiro card
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Aba Histórico */}
            {activeTab === 'history' && <HistoryTab deckId={deckId} isDark={isDark} />}
          </>
        )}
      </main>
    </div>
  );
}