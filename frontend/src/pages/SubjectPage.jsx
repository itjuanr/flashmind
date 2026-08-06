import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import {
  Plus, ChevronLeft, Loader2, BookOpen, Trash2, Calendar, Search,
  FileText, X, LayoutGrid, Book, Play, RotateCcw, Folder, ChevronDown,
  Image, Check, Bell, Pencil,
} from 'lucide-react';
import api from '../services/api';

// ─── Componente de Select com Busca ────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, icon: Icon, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  const inputCls = `w-full border px-4 py-3 rounded-xl outline-none transition-all text-sm text-left flex justify-between items-center ${
    isDark
      ? 'bg-white/4 border-white/8 focus:border-blue-500/50'
      : 'bg-black/3 border-black/8 focus:border-blue-500/50'
  } ${Icon ? 'pl-9' : ''}`;

  return (
    <div className="relative" ref={selectRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={inputCls}>
        {Icon && <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />}
        <span className={selectedOption && selectedOption.value ? (isDark ? 'text-white' : 'text-slate-800') : 'text-slate-500'}>
          {selectedOption ? `${selectedOption.icon} ${selectedOption.label}` : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-500 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-full rounded-2xl border shadow-2xl z-20 overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
          <div className="p-2">
            <input
              type="text"
              placeholder="Buscar matéria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className={`w-full border px-3 py-2 rounded-lg outline-none text-xs transition-all ${
                isDark
                  ? 'bg-white/4 border-white/8 focus:border-blue-500/50 text-white placeholder-slate-500'
                  : 'bg-black/3 border-black/8 focus:border-blue-500/50 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length > 0
              ? filteredOptions.map(opt => (
                  <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${ value === opt.value ? 'bg-blue-500/10 text-blue-400' : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-black/4' }`}>
                    <span className="text-base">{opt.icon}</span> <span>{opt.label}</span>
                  </button>
                ))
              : <p className="text-center text-xs text-slate-500 py-3">Nenhuma matéria encontrada</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Modal: Criar / Editar Deck (Versão Completa) ─────────────────────────────
function DeckModal({ onClose, onSaved, editing, toast, isDark }) {
  const fileRef = useRef();
  const tagInputRef = useRef();
  const [subjects, setSubjects] = useState([]);

  const [form, setForm] = useState({
    name:        editing?.name        || '',
    description: editing?.description || '',
    emoji:       editing?.emoji       || '📚',
    color:       editing?.color       || '#3B82F6',
    subjectId:   editing?.subjectId?._id || editing?.subjectId || '',
    deckImage:   editing?.deckImage   || null,
    tags:        editing?.tags        || [],
    reviewSettings: editing?.reviewSettings || { notify: true, newCardDelay: 1 },
  });
  const [iconMode, setIconMode] = useState(editing?.deckImage ? 'image' : 'emoji');
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get('/notebook/subjects')
      .then(res => setSubjects(res.data))
      .catch(() => {}); // Erro silencioso, o campo simplesmente não aparece
  }, []);

  const emojis = ['📚', '🧬', '🌍', '💻', '🎯', '🔬', '🏛️', '✏️', '🎨', '🚀'];
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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
      const res = editing?._id
        ? await api.put(`/decks/${editing._id}`, payload)
        : await api.post('/decks', payload);
      toast(editing?._id ? 'Deck atualizado!' : 'Deck criado!', 'success');
      onSaved(res.data, !!editing?._id);
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
        <div className={`flex items-center justify-between px-8 pt-7 pb-4 border-b ${isDark ? 'border-white/8' : 'border-black/6'} flex-shrink-0`}>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{editing?._id ? 'Editar deck' : 'Novo deck'}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{editing?._id ? 'Atualize as informações.' : 'Crie um novo deck para esta matéria.'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-6">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div>
                <div className="flex gap-2 flex-wrap">
                  {emojis.map((em) => (
                    <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })}
                      className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${form.emoji === em ? 'bg-blue-500/20 ring-2 ring-blue-500/50' : isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>{em}</button>
                  ))}
                  <input type="text" maxLength="2" placeholder="+" value={emojis.includes(form.emoji) ? '' : form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                    className={`w-10 h-10 rounded-xl text-lg text-center outline-none transition-all ${!emojis.includes(form.emoji) && form.emoji ? 'bg-blue-500/20 ring-2 ring-blue-500/50 text-blue-400' : isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300 placeholder-slate-500' : 'bg-black/5 hover:bg-black/10 text-slate-700 placeholder-slate-400'}`} />
                </div>
              </div>
              ) : (
                <div>
                  {form.deckImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/20 mb-2">
                      <img src={form.deckImage} alt="ícone" className="w-full max-h-28 object-contain" />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, deckImage: null }))} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-red-400 hover:bg-black/80"><X size={12} /></button>
                    </div>
                  ) : (
                    <div onClick={() => fileRef.current?.click()} className={`w-full border border-dashed rounded-xl px-4 py-5 flex flex-col items-center gap-2 cursor-pointer transition-all group ${isDark ? 'border-white/15 hover:border-blue-500/40' : 'border-black/15 hover:border-blue-500/40'}`}>
                      <Image size={22} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                      <span className="text-slate-500 text-xs">Clique para escolher uma imagem</span>
                      <span className="text-slate-600 text-xs">PNG, JPG, WEBP — máx 2MB</span>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Nome *</label>
              <input type="text" required placeholder="Ex: Biologia Celular" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Descrição (opcional)</label>
              <textarea placeholder="Sobre o que é esse deck?" rows={2} className={`${inputCls} resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {subjects.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Matéria (opcional)</label>
                <SearchableSelect
                  isDark={isDark}
                  icon={Folder}
                  placeholder="Nenhuma matéria"
                  value={form.subjectId}
                  onChange={(val) => setForm({ ...form, subjectId: val })}
                  options={[
                    { value: '', label: 'Nenhuma matéria', icon: '🗂️' },
                    ...subjects.map(s => ({ value: s._id, label: s.name, icon: s.emoji }))
                  ]}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Cor</label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center ${form.color === c ? 'ring-2 ring-white/50 scale-110' : 'opacity-50 hover:opacity-90'}`}>
                    {form.color === c && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={17} className="animate-spin" /> Salvando...</> : editing?._id ? <><Check size={17} /> Salvar alterações</> : <><Plus size={17} /> Criar deck</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SubjectPage() {
  const { subjectId } = useParams();
  const { theme }     = useTheme();
  const isDark        = theme === 'dark';
  const navigate      = useNavigate();
  const toast         = useToast();
  const location      = useLocation();

  const [subject, setSubject]           = useState(null);
  const [notes, setNotes]               = useState([]);
  const [decks, setDecks]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [creating, setCreating]         = useState(false);
  const [studyingSubject, setStudyingSubject] = useState(false);
  const [showDeckModal, setShowDeckModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);
  const [totalFlashcards, setTotalFlashcards] = useState(0);

  const query = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(query.get('tab') || 'decks');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (subjectId === 'unassigned') {
          setSubject({ name: 'Sem matéria', emoji: '🗂️', _id: 'unassigned' });
          setActiveTab('decks');
          const dRes = await api.get(`/notebook/subjects/unassigned/decks`);
          setDecks(dRes.data);
          const calculatedTotalFlashcards = dRes.data.reduce((sum, deck) => sum + (deck.flashcardCount || 0), 0);
          setTotalFlashcards(calculatedTotalFlashcards);
        } else {
          const [sRes, nRes, dRes] = await Promise.allSettled([
            api.get(`/notebook/subjects/${subjectId}`),
            api.get(`/notebook/subjects/${subjectId}/notes`),
            api.get(`/notebook/subjects/${subjectId}/decks`),
          ]);

          // Só a matéria é essencial: sem ela não há o que renderizar.
          if (sRes.status === 'rejected') throw sRes.reason;
          setSubject(sRes.value.data);

          // Aulas e decks falham de forma isolada, sem derrubar a página.
          if (nRes.status === 'fulfilled') setNotes(nRes.value.data);
          else toast('Não foi possível carregar as aulas.', 'error');

          if (dRes.status === 'fulfilled') {
            setDecks(dRes.value.data);
            setTotalFlashcards(dRes.value.data.reduce((sum, deck) => sum + (deck.flashcardCount || 0), 0));
          } else {
            setDecks([]);
            setTotalFlashcards(0);
            toast('Não foi possível carregar os decks.', 'error');
          }
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          toast('Matéria não encontrada ou acesso negado.', 'error');
          navigate('/notebook'); // Redireciona para o caderno se a matéria não for encontrada
        } else { toast('Erro ao carregar dados da matéria.', 'error'); }
      }
      finally { setLoading(false); }
    };
    loadData();
  }, [subjectId, toast]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const now = new Date();
      const title = `Aula — ${now.toLocaleDateString('pt-BR', { day:'2-digit', month:'long' })}`;
      const res = await api.post(`/notebook/subjects/${subjectId}/notes`, { title, date: now });
      navigate(`/notebook/${subjectId}/${res.data._id}`);
    } catch { toast('Erro ao criar aula.', 'error'); setCreating(false); }
  };

  const handleStudySubject = async () => {
    if (!subject?._id || subject._id === 'unassigned') return;
    setStudyingSubject(true);
    try {
      const res = await api.get(`/study/subject/${subject._id}/study`);
      if (res.data.length === 0) {
        toast('Nenhum card para revisar nesta matéria agora.', 'info');
        return;
      }
      navigate('/study', {
        state: {
          cards: res.data,
          title: `Revisão de ${subject.name}`,
        },
      });
    } catch (error) {
      toast('Erro ao buscar cards da matéria.', 'error');
    } finally {
      setStudyingSubject(false);
    }
  };

  const handleDeckSaved = async (newDeck, isEdit) => {
    // Após criar ou editar um deck, o ideal é recarregar a lista de decks
    // para garantir que todos os dados (contagens, etc.) estejam atualizados.
    try {
      const dRes = await api.get(`/notebook/subjects/${subjectId}/decks`); // Rota corrigida
      setDecks(dRes.data);
      const calculatedTotalFlashcards = dRes.data.reduce((sum, deck) => sum + (deck.flashcardCount || 0), 0);
      setTotalFlashcards(calculatedTotalFlashcards);
    } catch {
      toast('Erro ao atualizar a lista de decks.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/notebook/notes/${confirmDelete._id}`);
      setNotes(prev => prev.filter(n => n._id !== confirmDelete._id));
      toast('Aula removida.', 'success');
    } catch { toast('Erro ao remover.', 'error'); }
    setConfirmDelete(null);
  };

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  const filteredDecks = decks.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d) => new Date(d).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <Loader2 size={28} className="animate-spin text-slate-600"/>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${subject?.color || '#8B5CF6'}15, transparent 70%)` }}/>
      <Navbar/>

      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16 relative z-10">

        {/* Voltar */}
        <button onClick={() => navigate('/notebook')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors group">
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform"/> Caderno
        </button>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <span className="text-5xl">{subject?.emoji || '📓'}</span>
            <div>
              <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {subject?.name || 'Matéria'}
              </h1>
              {subject?.semester && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mt-2 inline-block ${isDark ? 'bg-white/8 text-slate-400' : 'bg-black/6 text-slate-500'}`}>
                  {subject.semester}
                </span>
              )}
              {subject?.description && (
                <p className="text-slate-500 text-sm mt-2">{subject.description}</p>
              )}
              {totalFlashcards > 0 && (
                <p className="text-slate-500 text-sm mt-2 flex items-center gap-1.5">
                  <Book size={14} className="text-blue-400" />
                  <span className="font-medium text-white">{totalFlashcards}</span> flashcard{totalFlashcards !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {subjectId !== 'unassigned' && (
              <button onClick={handleStudySubject} disabled={studyingSubject}
                className="flex items-center gap-2 bg-blue-600/10 hover:bg-blue-600/20 disabled:opacity-50 text-blue-400 font-semibold px-4 py-2.5 rounded-xl transition-all text-sm">
                {studyingSubject
                  ? <Loader2 size={15} className="animate-spin" />
                  : <BookOpen size={15} />
                }
                Estudar Matéria
              </button>
            )}
            {activeTab === 'decks' && (
              <button onClick={() => setShowDeckModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex-shrink-0">
                <Plus size={15}/>
                Criar Deck
              </button>
            )}
            {subjectId !== 'unassigned' && activeTab === 'notes' && (
              <button onClick={handleCreate} disabled={creating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex-shrink-0">
                {creating ? <Loader2 size={15} className="animate-spin"/> : <Plus size={15}/>}
                Nova aula
              </button>
            )}
          </div>
        </div>

        {/* Busca */}
        {(notes.length > 3 || decks.length > 3) && (
          <div className="relative mb-6 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar aulas..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-all ${
                isDark ? 'bg-white/4 border-white/8 focus:border-blue-500/40 text-white placeholder-slate-600'
                       : 'bg-black/3 border-black/8 focus:border-blue-500/40 text-slate-800 placeholder-slate-400'
              }`}/>
          </div>
        )}
        
        {/* Tabs */}
        {subjectId !== 'unassigned' && (
          <div className={`flex items-center gap-1 p-1 rounded-xl w-fit mb-6 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            {[
              { id: 'decks', icon: <LayoutGrid size={14} />, label: 'Decks' },
              { id: 'notes', icon: <FileText size={14} />,   label: 'Aulas' },
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
        )}

        {/* Conteúdo da Aba */}
        {activeTab === 'notes' && (
          notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}><BookOpen size={32} className="text-slate-600"/></div>
              <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Nenhuma aula ainda</h3>
              <p className="text-slate-500 text-sm mb-5">Clique em "Nova aula" para começar suas anotações.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((note, i) => (
                <div key={note._id} onClick={() => navigate(`/notebook/${subjectId}/${note._id}`)}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${isDark ? 'bg-[#12121E] border-white/6 hover:border-white/12' : 'bg-white border-black/6 hover:border-black/12 shadow-sm'}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: `${subject?.color || '#3B82F6'}20`, color: subject?.color || '#3B82F6' }}>{filtered.length - i}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{note.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Calendar size={11} className="text-slate-600"/><span className="text-slate-500 text-xs">{formatDate(note.date)}</span>
                      {note.attachments?.length > 0 && (<span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${isDark ? 'bg-white/5 text-slate-500' : 'bg-black/5 text-slate-400'}`}>{note.attachments.length} anexo{note.attachments.length > 1 ? 's' : ''}</span>)}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setConfirmDelete(note); }} className="p-2 rounded-lg opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={14}/></button>
                </div>
              ))}
              {search && filtered.length === 0 && (<p className="text-center text-slate-500 text-sm py-8">Nenhuma aula encontrada para "{search}"</p>)}
            </div>
          )
        )}

        {activeTab === 'decks' && (
          decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}><LayoutGrid size={32} className="text-slate-500"/></div>
              <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Nenhum deck nesta matéria</h3>
              <p className="text-slate-500 text-sm mb-5">Crie ou associe um deck a esta matéria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDecks.map(deck => (
                <div key={deck._id}
                  className={`glass rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative flex flex-col justify-between p-6 h-auto min-h-[13rem]`}>
                  <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity pointer-events-none" style={{ backgroundColor: deck.color || '#3B82F6' }} />
                  <div className="absolute inset-0 rounded-2xl cursor-pointer z-0" onClick={() => navigate(`/deck/${deck._id}`)} />
                  <div className="relative z-10 flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {deck.deckImage ? <img src={deck.deckImage} alt={deck.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" /> : <span className="text-2xl flex-shrink-0">{deck.emoji || '📚'}</span>}
                      <div className="min-w-0">
                        <h3 className={`font-semibold text-base leading-tight group-hover:text-blue-300 transition-colors truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{deck.name}</h3>
                        {deck.description && <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{deck.description}</p>}
                      </div>
                    </div>
                    {/* Botão de Editar */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2 z-10">
                      <button onClick={(e) => { e.stopPropagation(); setEditingDeck(deck); setShowDeckModal(true); }}
                        className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {deck.flashcardCount > 0 && (
                        <div className="mb-1.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-600 text-[10px]">{deck.masteredCount || 0}/{deck.flashcardCount} dominados</span>
                            {deck.dueCount > 0 && deck.reviewSettings?.notify !== false && <span className="text-[10px] font-semibold text-amber-400">{deck.dueCount} para revisar</span>}
                          </div>
                          <div className={`h-1 rounded-full w-full ${isDark ? 'bg-white/8' : 'bg-black/8'}`}><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.round(((deck.masteredCount || 0) / deck.flashcardCount) * 100)}%` }} /></div>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs"><Book size={11} /><span>{deck.flashcardCount || 0} cards</span></div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {deck.dueCount > 0 && deck.reviewSettings?.notify !== false && (<button onClick={(e) => { e.stopPropagation(); navigate(`/study/${deck._id}?mode=due`); }} title="Revisar cards vencidos" className="flex items-center gap-1 text-xs font-semibold px-2.5 py-2 rounded-lg transition-all text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"><RotateCcw size={11} /></button>)}
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/study/${deck._id}`); }} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: `${deck.color || '#3B82F6'}18`, color: deck.color || '#3B82F6' }}><Play size={12} fill="currentColor" /> Estudar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {showDeckModal && (
        <DeckModal
          onClose={() => { setShowDeckModal(false); setEditingDeck(null); }}
          onSaved={handleDeckSaved}
          editing={editingDeck || { subjectId: subject?._id }}
          toast={toast}
          isDark={isDark}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-8 text-center ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Excluir aula?</h3>
            <p className="text-slate-500 text-sm mb-6">
              "<span className="font-semibold text-white">{confirmDelete.title}</span>" e todos os seus anexos serão removidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm border transition-all ${isDark ? 'border-white/8 text-slate-400 hover:bg-white/5' : 'border-black/8 text-slate-500'}`}>
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-red-500 hover:bg-red-400 text-white transition-all">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}