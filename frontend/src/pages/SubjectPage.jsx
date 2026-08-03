import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import {
  Plus, ChevronLeft, Loader2, BookOpen, Trash2, Calendar,
  Search, FileText, X, LayoutGrid, Book, Play, RotateCcw,
  Folder, ChevronDown, Image, Check, Bell, Pencil,
} from 'lucide-react';
import api from '../services/api';

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

  const query = new URLSearchParams(location.search);
  const [activeTab, setActiveTab] = useState(query.get('tab') || 'decks');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (subjectId === 'unassigned') {
          setSubject({ name: 'Sem matéria', emoji: '🗂️', _id: 'unassigned' });
          setActiveTab('decks');
          const dRes = await api.get(`/decks/subject/unassigned`);
          setDecks(dRes.data);
        } else {
          const [sRes, nRes, dRes] = await Promise.all([
            api.get(`/notebook/subjects/${subjectId}`),
            api.get(`/notebook/subjects/${subjectId}/notes`),
            api.get(`/decks/subject/${subjectId}`),
          ]);
          setSubject(sRes.data);
          setNotes(nRes.data);
          setDecks(dRes.data);
        }
      } catch { toast('Erro ao carregar.', 'error'); }
      finally { setLoading(false); }
    };
    load();
  }, [subjectId]);

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

  const handleDeckSaved = (newDeck, isEdit) => {
    if (isEdit) {
      setDecks(prev => prev.map(d => (d._id === newDeck._id ? newDeck : d)));
    } else {
      setDecks(prev => [newDeck, ...prev]);
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
              <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}><LayoutGrid size={32} className="text-slate-600"/></div>
              <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Nenhum deck nesta matéria</h3>
              <p className="text-slate-500 text-sm mb-5">Crie ou associe um deck a esta matéria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDecks.map(deck => (
                <div key={deck._id}
                  className={`glass rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative flex flex-col justify-between p-6 h-auto min-h-[13rem]`}>
                  <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity pointer-events-none" style={{ backgroundColor: deck.color || '#4F8EF7' }} />
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
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/study/${deck._id}`); }} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: `${deck.color || '#4F8EF7'}18`, color: deck.color || '#4F8EF7' }}><Play size={12} fill="currentColor" /> Estudar</button>
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
          editing={editingDeck || { subjectId: subject }}
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