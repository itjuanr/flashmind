import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import {
  Plus, ChevronLeft, Loader2, BookOpen, Trash2,
  Calendar, Search, FileText, X,
} from 'lucide-react';
import api from '../services/api';

export default function SubjectPage() {
  const { subjectId } = useParams();
  const { theme }     = useTheme();
  const isDark        = theme === 'dark';
  const navigate      = useNavigate();
  const toast         = useToast();

  const [subject, setSubject]           = useState(null);
  const [notes, setNotes]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [creating, setCreating]         = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, nRes] = await Promise.all([
          api.get(`/notebook/subjects`),
          api.get(`/notebook/subjects/${subjectId}/notes`),
        ]);
        const found = sRes.data.find(s => s._id === subjectId);
        setSubject(found || null);
        setNotes(nRes.data);
      } catch { toast('Erro ao carregar aulas.', 'error'); }
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
          <button onClick={handleCreate} disabled={creating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] flex-shrink-0">
            {creating ? <Loader2 size={15} className="animate-spin"/> : <Plus size={15}/>}
            Nova aula
          </button>
        </div>

        {/* Busca */}
        {notes.length > 3 && (
          <div className="relative mb-6 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar aulas..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-all ${
                isDark ? 'bg-white/4 border-white/8 focus:border-blue-500/40 text-white placeholder-slate-600'
                       : 'bg-black/3 border-black/8 focus:border-blue-500/40 text-slate-800 placeholder-slate-400'
              }`}/>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
              <BookOpen size={32} className="text-slate-600"/>
            </div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Nenhuma aula ainda</h3>
            <p className="text-slate-500 text-sm mb-5">Clique em "Nova aula" para começar suas anotações.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((note, i) => (
              <div key={note._id}
                onClick={() => navigate(`/notebook/${subjectId}/${note._id}`)}
                className={`group flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                  isDark ? 'bg-[#12121E] border-white/6 hover:border-white/12' : 'bg-white border-black/6 hover:border-black/12 shadow-sm'
                }`}>
                {/* Número */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: `${subject?.color || '#3B82F6'}20`, color: subject?.color || '#3B82F6' }}>
                  {filtered.length - i}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{note.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar size={11} className="text-slate-600"/>
                    <span className="text-slate-500 text-xs">{formatDate(note.date)}</span>
                    {note.attachments?.length > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${isDark ? 'bg-white/5 text-slate-500' : 'bg-black/5 text-slate-400'}`}>
                        {note.attachments.length} anexo{note.attachments.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(note); }}
                  className="p-2 rounded-lg opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                  <Trash2 size={14}/>
                </button>
              </div>
            ))}
            {search && filtered.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-8">Nenhuma aula encontrada para "{search}"</p>
            )}
          </div>
        )}
      </main>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-8 text-center ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
            <div className="text-4xl mb-4">🗑️</div>
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