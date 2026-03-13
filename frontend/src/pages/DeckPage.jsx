import { useEffect, useState, useRef, useCallback, memo } from 'react';
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
// Memo evita re-render do ImagePicker quando texto do form muda
const ImagePickerMemo = memo(ImagePicker);
const AudioPickerMemo = memo(AudioPicker);

function CardModal({ onClose, onSaved, deckId, editing, toast, isDark }) {
  // Campos de texto ficam em refs — sem re-render a cada tecla
  const frontRef = useRef(editing?.front || '');
  const backRef  = useRef(editing?.back  || '');
  const notesRef = useRef(editing?.notes || '');

  // Só mídia e estados visuais ficam em state (mudam raramente)
  const [frontImage, setFrontImage] = useState(editing?.frontImage || null);
  const [backImage,  setBackImage]  = useState(editing?.backImage  || null);
  const [frontAudio, setFrontAudio] = useState(editing?.frontAudio || null);
  const [backAudio,  setBackAudio]  = useState(editing?.backAudio  || null);

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [showNotes, setShowNotes] = useState(!!(editing?.notes));

  // Contador de palavras — só atualiza no blur, não a cada tecla
  const [frontStats, setFrontStats] = useState({ words: 0, chars: editing?.front?.length || 0 });
  const [backStats,  setBackStats]  = useState({ words: 0, chars: editing?.back?.length  || 0 });
  const calcStats = (str) => ({ words: str.trim().split(/\s+/).filter(Boolean).length, chars: str.trim().length });

  // Callbacks estáveis — não recria os filhos
  const handleFrontImage = useCallback((v) => setFrontImage(v), []);
  const handleBackImage  = useCallback((v) => setBackImage(v),  []);
  const handleFrontAudio = useCallback((v) => setFrontAudio(v), []);
  const handleBackAudio  = useCallback((v) => setBackAudio(v),  []);

  // Sincroniza quando troca de card editado
  useEffect(() => {
    if (!editing) return;
    frontRef.current = editing.front || '';
    backRef.current  = editing.back  || '';
    notesRef.current = editing.notes || '';
    setFrontImage(editing.frontImage || null);
    setBackImage(editing.backImage   || null);
    setFrontAudio(editing.frontAudio || null);
    setBackAudio(editing.backAudio   || null);
    setShowNotes(!!(editing.notes));
  }, [editing?._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const front = frontRef.current;
    const back  = backRef.current;
    const notes = notesRef.current;

    const frontOk = front.trim() || frontImage || frontAudio;
    const backOk  = back.trim()  || backImage  || backAudio;
    if (!frontOk || !backOk) {
      setError(
        !frontOk && !backOk ? 'Adicione conteúdo na pergunta e na resposta (texto, imagem ou áudio).'
        : !frontOk ? 'A pergunta precisa de texto, imagem ou áudio.'
        : 'A resposta precisa de texto, imagem ou áudio.'
      );
      return;
    }

    setLoading(true);
    const payload = { front, back, notes, frontImage, backImage, frontAudio, backAudio };
    try {
      let res;
      if (editing) {
        res = await api.put(`/flashcards/${editing._id}`, payload);
        toast('Card atualizado!', 'success');
      } else {
        res = await api.post('/flashcards', { ...payload, deckId });
        toast('Flashcard criado!', 'success');
      }
      onSaved(res.data, !!editing);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao salvar card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0F0F18] rounded-3xl border border-white/10 flex flex-col" style={{ maxHeight: '90vh' }}>
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
          {error && <div className="animate-fade-in-down bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Frente */}
          <div className="space-y-3 p-4 rounded-2xl border border-white/6 bg-white/2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Frente</p>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Pergunta</label>
                <span className="text-[10px] text-slate-600">{frontStats.words} palavras · {frontStats.chars} chars</span>
              </div>
              <textarea rows={2} placeholder="O que você quer memorizar?"
                className="w-full bg-white/4 border border-white/8 focus:border-blue-500/50 px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm resize-none"
                defaultValue={frontRef.current}
                onChange={(e) => { frontRef.current = e.target.value; }}
                onBlur={(e) => setFrontStats(calcStats(e.target.value))} />
            </div>
            <ImagePickerMemo label="Imagem (opcional)" value={frontImage} onChange={handleFrontImage} />
            <AudioPickerMemo label="Áudio (opcional)"  value={frontAudio} onChange={handleFrontAudio} />
          </div>

          {/* Verso */}
          <div className="space-y-3 p-4 rounded-2xl border border-blue-500/10 bg-blue-500/2">
            <p className="text-xs font-bold text-blue-500/50 uppercase tracking-widest">Verso</p>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">Resposta</label>
                <span className="text-[10px] text-slate-600">{backStats.words} palavras · {backStats.chars} chars</span>
              </div>
              <textarea rows={2} placeholder="A resposta que deve aparecer ao virar."
                className="w-full bg-white/4 border border-white/8 focus:border-blue-500/50 px-4 py-3 rounded-xl outline-none transition-all text-white placeholder-slate-600 text-sm resize-none"
                defaultValue={backRef.current}
                onChange={(e) => { backRef.current = e.target.value; }}
                onBlur={(e) => setBackStats(calcStats(e.target.value))} />
            </div>
            <ImagePickerMemo label="Imagem (opcional)" value={backImage}  onChange={handleBackImage} />
            <AudioPickerMemo label="Áudio (opcional)"  value={backAudio}  onChange={handleBackAudio} />
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
                defaultValue={notesRef.current}
                onChange={(e) => { notesRef.current = e.target.value; }} />
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
  const [activeTab, setActiveTab]   = useState('cards');
  const [search, setSearch]         = useState('');
  const [shareToken, setShareToken] = useState(null);
  const [sharing, setSharing]       = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeckMenu, setShowDeckMenu] = useState(false);
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(false);
  const deckMenuRef = useRef();

  // Ordenação de cards
  const [cardSort, setCardSort] = useState('position'); // 'position'|'az'|'za'|'level'|'due'
  const [showCardSort, setShowCardSort] = useState(false);
  const cardSortRef = useRef();

  // Drag & drop para reordenar
  const [dragId, setDragId]       = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [deckRes, cardsRes] = await Promise.all([api.get(`/decks/${deckId}`), api.get(`/flashcards/deck/${deckId}`)]);
        setDeck(deckRes.data);
        setCards(cardsRes.data);
        setShareToken(deckRes.data.shareToken || null);
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

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await api.patch(`/decks/${deckId}/share`);
      setShareToken(res.data.shareToken);
      if (res.data.shareToken) setShowShareModal(true);
      else toast('Link revogado.', 'info');
    } catch { toast('Erro ao compartilhar.', 'error'); }
    finally { setSharing(false); }
  };

  const handleDeleteDeck = async () => {
    try {
      await api.delete(`/decks/${deckId}`);
      toast('Deck excluído.', 'info');
      navigate('/dashboard');
    } catch { toast('Erro ao excluir deck.', 'error'); }
  };

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (deckMenuRef.current && !deckMenuRef.current.contains(e.target)) setShowDeckMenu(false);
      if (cardSortRef.current && !cardSortRef.current.contains(e.target)) setShowCardSort(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Atalho N → novo card
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'n' || e.key === 'N') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        setEditing(null); setShowModal(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleColorChange = async (card, color) => {
    try {
      const res = await api.put(`/flashcards/${card._id}`, { cardColor: color });
      setCards((prev) => prev.map((c) => c._id === card._id ? res.data : c));
    } catch { toast('Erro ao alterar cor.', 'error'); }
  };

  // Drag & drop reorder
  const handleDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver  = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop      = async (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const reordered = [...cards];
    const fromIdx = reordered.findIndex((c) => c._id === dragId);
    const toIdx   = reordered.findIndex((c) => c._id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withPos = reordered.map((c, i) => ({ ...c, position: i }));
    setCards(withPos);
    setDragId(null); setDragOverId(null);
    try {
      await api.patch('/flashcards/reorder', { order: withPos.map(({ _id, position }) => ({ _id, position })) });
    } catch { toast('Erro ao reordenar.', 'error'); }
  };

  // Ordenação visual dos cards
  const sortedCards = [...cards].sort((a, b) => {
    switch (cardSort) {
      case 'az':    return (a.front||'').localeCompare(b.front||'');
      case 'za':    return (b.front||'').localeCompare(a.front||'');
      case 'level': return (b.level||0) - (a.level||0);
      case 'due':   return new Date(a.nextReview) - new Date(b.nextReview);
      default:      return (a.position||0) - (b.position||0);
    }
  });

  const CARD_SORT_OPTIONS = [
    { value: 'position', label: 'Ordem manual' },
    { value: 'az',       label: 'A → Z' },
    { value: 'za',       label: 'Z → A' },
    { value: 'level',    label: 'Nível (maior)' },
    { value: 'due',      label: 'Próxima revisão' },
  ];

  const exportXlsx = async () => {
    if (cards.length === 0) { toast('Nenhum card para exportar.', 'error'); return; }
    // Carrega SheetJS se necessário
    if (!window.XLSX) {
      await new Promise((res) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = res; document.head.appendChild(s);
      });
    }
    const XLSX = window.XLSX;
    const data = [
      ["frente", "verso", "notas", "nivel", "favorito", "cor"],
      ...cards.map((c) => [
        c.front || '',
        c.back  || '',
        c.notes || '',
        c.level || 1,
        c.isFavorite ? 'sim' : 'nao',
        c.cardColor || '',
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 36 }, { wch: 36 }, { wch: 22 }, { wch: 8 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flashcards");
    XLSX.writeFile(wb, `${deck?.name || 'deck'}.xlsx`);
    toast(`${cards.length} cards exportados!`, 'success');
  };

  const handleImported = () => {
    api.get(`/flashcards/deck/${deckId}`).then((r) => setCards(r.data)).catch(() => {});
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  // Filtro de busca (sobre cards já ordenados)
  const filtered = search.trim()
    ? sortedCards.filter((c) =>
        (c.front||'').toLowerCase().includes(search.toLowerCase()) ||
        (c.back||'').toLowerCase().includes(search.toLowerCase()) ||
        (c.notes || '').toLowerCase().includes(search.toLowerCase())
      )
    : sortedCards;

  return (
    <div className="min-h-screen text-slate-200" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <Navbar />

      {showModal && <CardModal onClose={closeModal} onSaved={handleSaved} deckId={deckId} editing={editing} toast={toast} isDark={isDark} />}
      {showImport && <CsvImportModal deckId={deckId} deckName={deck?.name||''} onClose={() => setShowImport(false)} onImported={handleImported} />}

      {showShareModal && shareToken && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0F0F18] rounded-3xl border border-white/10 p-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-white font-bold text-lg mb-2">Deck compartilhado!</h3>
            <p className="text-slate-500 text-sm mb-6">Qualquer pessoa com este link pode visualizar e clonar o deck.</p>
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-6 ${isDark ? 'bg-white/4 border-white/8' : 'bg-black/3 border-black/8'}`}>
              <span className="text-xs text-slate-400 truncate flex-1 text-left">{window.location.origin}/share/{shareToken}</span>
              <button onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`);
                toast('Link copiado!', 'success');
              }} className="text-blue-400 hover:text-blue-300 flex-shrink-0"><Copy size={14} /></button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { handleShare(); setShowShareModal(false); }}
                className="flex-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-400 font-semibold py-3 rounded-xl transition-all text-sm">
                Revogar link
              </button>
              <button onClick={() => setShowShareModal(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/8 text-slate-300 font-semibold py-3 rounded-xl transition-all text-sm">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteDeck && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0F0F18] rounded-3xl border border-white/10 p-8 text-center">
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
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0F0F18] rounded-3xl border border-white/10 p-8 text-center">
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
                    <div className={`absolute right-0 top-full mt-2 w-52 rounded-2xl border shadow-2xl z-30 overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
                      {cards.length > 0 && (
                        <button onClick={() => { exportXlsx(); setShowDeckMenu(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-all ${isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-700 hover:bg-black/4'}`}>
                          <Download size={14} className="text-slate-500" /> Exportar Excel (.xlsx)
                        </button>
                      )}
                      <button onClick={() => { setShowImport(true); setShowDeckMenu(false); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-all ${isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-700 hover:bg-black/4'}`}>
                        <FileUp size={14} className="text-slate-500" /> Importar CSV
                      </button>
                      <button
                        onClick={() => {
                          setShowDeckMenu(false);
                          if (shareToken) {
                            setShowShareModal(true); // já tem token → só exibe modal
                          } else {
                            handleShare(); // sem token → gera
                          }
                        }}
                        disabled={sharing}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-all ${shareToken ? 'text-emerald-400 hover:bg-emerald-500/10' : isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-700 hover:bg-black/4'}`}>
                        <Link size={14} className="text-slate-500" /> {shareToken ? 'Link ativo (ver)' : 'Compartilhar deck'}
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
                {/* Busca + Ordenação */}
                {cards.length > 0 && (
                  <div className="flex items-center gap-3 mb-6 flex-wrap">
                    <div className="relative flex-1 max-w-sm">
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
                    {/* Ordenar cards */}
                    <div className="relative" ref={cardSortRef}>
                      <button onClick={() => setShowCardSort((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${isDark ? 'border-white/8 text-slate-400 hover:border-white/15' : 'border-black/8 text-slate-500 hover:border-black/15'}`}>
                        <ArrowLeft size={12} className="rotate-90" />
                        {CARD_SORT_OPTIONS.find((o) => o.value === cardSort)?.label}
                      </button>
                      {showCardSort && (
                        <div className={`absolute right-0 top-full mt-1 w-44 rounded-2xl border shadow-xl z-30 overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
                          {CARD_SORT_OPTIONS.map((opt) => (
                            <button key={opt.value} onClick={() => { setCardSort(opt.value); setShowCardSort(false); }}
                              className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors ${
                                cardSort === opt.value ? 'text-blue-400 bg-blue-500/10' : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-black/4'
                              }`}>
                              {opt.label}
                              {cardSort === opt.value && <CheckCircle2 size={12} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Hint arraste para reordenar */}
                    {cardSort === 'position' && cards.length > 1 && !search && (
                      <span className="text-[10px] text-slate-600 hidden sm:block">Arraste para reordenar</span>
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
                        <div key={card._id}
                          draggable={cardSort === 'position' && !search}
                          onDragStart={(e) => handleDragStart(e, card._id)}
                          onDragOver={(e) => handleDragOver(e, card._id)}
                          onDrop={(e) => handleDrop(e, card._id)}
                          onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                          className={`transition-all ${dragOverId === card._id && dragId !== card._id ? 'scale-105 ring-2 ring-blue-500/40 rounded-2xl' : ''} ${dragId === card._id ? 'opacity-40' : ''}`}
                        >
                          <FlashCard card={card}
                            onFavorite={handleFavorite}
                            onEdit={(c) => { setEditing(c); setShowModal(true); }}
                            onDuplicate={handleDuplicateCard}
                            onDelete={(c) => setConfirmDeleteCard(c)}
                            onColorChange={handleColorChange} />
                        </div>
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