import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import SearchableSelect from '../components/SearchableSelect'; // Importar o componente
import { Plus, Loader2, Folder, Search, LayoutGrid, List, Pencil, Trash2, X } from 'lucide-react';
import api from '../services/api';

// ─── Modal: Criar / Editar Matéria ─────────────────────────────────────────────
function SubjectModal({ onClose, onSaved, editing, toast, isDark }) {
  const [form, setForm] = useState({
    name: editing?.name || '',
    semester: editing?.semester || '',
    emoji: editing?.emoji || '📚',
    color: editing?.color || '#3B82F6',
    description: editing?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emojis = ['📚', '🧬', '🌍', '💻', '🎯', '🔬', '🏛️', '✏️', '🎨', '🚀'];
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Dê um nome para a matéria.'); return; }
    setLoading(true);
    try {
      const res = editing?._id
        ? await api.put(`/notebook/subjects/${editing._id}`, form)
        : await api.post('/notebook/subjects', form);
      toast(editing?._id ? 'Matéria atualizada!' : 'Matéria criada!', 'success');
      onSaved(res.data, !!editing?._id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar matéria.');
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
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{editing?._id ? 'Editar matéria' : 'Nova matéria'}</h2>
            <p className="text-slate-500 text-sm mt-0.5">{editing?._id ? 'Atualize as informações.' : 'Crie uma nova matéria para organizar seus estudos.'}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-8 py-6">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Nome *</label>
              <input type="text" required placeholder="Ex: Biologia Celular" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Semestre (opcional)</label>
              <input type="text" placeholder="Ex: 1º Semestre, 2024/1" className={inputCls} value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Descrição (opcional)</label>
              <textarea placeholder="Sobre o que é essa matéria?" rows={2} className={`${inputCls} resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Ícone</label>
              <div className="flex gap-2 flex-wrap">
                {emojis.map((em) => (
                  <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${form.emoji === em ? 'bg-blue-500/20 ring-2 ring-blue-500/50' : isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}>{em}</button>
                ))}
                <input type="text" maxLength="2" placeholder="+" value={emojis.includes(form.emoji) ? '' : form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  className={`w-10 h-10 rounded-xl text-lg text-center outline-none transition-all ${!emojis.includes(form.emoji) && form.emoji ? 'bg-blue-500/20 ring-2 ring-blue-500/50 text-blue-400' : isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300 placeholder-slate-500' : 'bg-black/5 hover:bg-black/10 text-slate-700 placeholder-slate-400'}`} />
              </div>
            </div>
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
              {loading ? <><Loader2 size={17} className="animate-spin" /> Salvando...</> : editing?._id ? <><Check size={17} /> Salvar alterações</> : <><Plus size={17} /> Criar matéria</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function NotebookPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const toast = useToast();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState(null);

  // --- UI/UX Improvements ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState(localStorage.getItem('notebookSemesterFilter') || '');
  const [layoutView, setLayoutView] = useState(localStorage.getItem('notebookLayoutView') || 'grid'); // 'grid' or 'list'

  useEffect(() => {
    localStorage.setItem('notebookSemesterFilter', selectedSemester);
  }, [selectedSemester]);

  useEffect(() => {
    localStorage.setItem('notebookLayoutView', layoutView);
  }, [layoutView]);
  // --- End UI/UX Improvements ---

  useEffect(() => {
    const loadSubjects = async () => {
      setLoading(true);
      try {
        const res = await api.get('/notebook/subjects');
        setSubjects(res.data);
      } catch {
        toast('Erro ao carregar matérias.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadSubjects();
  }, [toast]);

  const handleSubjectSaved = (newSubject, isEdit) => {
    if (isEdit) {
      setSubjects(prev => prev.map(s => (s._id === newSubject._id ? newSubject : s)));
    } else {
      setSubjects(prev => [newSubject, ...prev]);
    }
  };

  const handleDeleteSubject = async () => {
    if (!confirmDeleteSubject) return;
    try {
      await api.delete(`/notebook/subjects/${confirmDeleteSubject._id}`);
      setSubjects(prev => prev.filter(s => s._id !== confirmDeleteSubject._id));
      toast('Matéria excluída.', 'info');
    } catch { toast('Erro ao excluir matéria.', 'error'); }
    finally { setConfirmDeleteSubject(null); }
  };

  const uniqueSemesters = useMemo(() => {
    const semesters = new Set(subjects.map(s => s.semester).filter(Boolean));
    return [{ value: '', label: 'Todos os semestres', icon: '🗓️' }, ...Array.from(semesters).sort().map(s => ({ value: s, label: s, icon: '📚' }))];
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    let filtered = subjects;
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.semester?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedSemester) {
      filtered = filtered.filter(s => s.semester === selectedSemester);
    }
    return filtered;
  }, [subjects, searchQuery, selectedSemester]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <Loader2 size={28} className="animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16 relative z-10">
        <h1 className={`text-3xl font-bold mb-8 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Caderno
        </h1>

        {/* --- Filters and Layout Toggle --- */}
        {subjects.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar matérias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all border ${
                  isDark ? 'bg-white/4 border-white/8 focus:border-blue-500/40 text-white placeholder-slate-600' : 'bg-black/3 border-black/8 focus:border-blue-500/40 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
            <div className="w-full sm:w-auto">
              <SearchableSelect
                isDark={isDark}
                icon={Folder}
                placeholder="Filtrar por semestre"
                value={selectedSemester}
                onChange={setSelectedSemester}
                options={uniqueSemesters}
              />
            </div>
            <div className={`flex items-center gap-1 p-1 rounded-xl w-fit flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <button onClick={() => setLayoutView('grid')}
                className={`p-2 rounded-lg transition-all ${layoutView === 'grid' ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-300'}`}>
                <LayoutGrid size={16} />
              </button>
              <button onClick={() => setLayoutView('list')}
                className={`p-2 rounded-lg transition-all ${layoutView === 'list' ? (isDark ? 'bg-white/10 text-white' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-300'}`}>
                <List size={16} />
              </button>
            </div>
          </div>
        )}
        {/* --- End Filters and Layout Toggle --- */}

        {filteredSubjects.length === 0 && subjects.length > 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={32} className="text-slate-600 mb-5" />
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Nenhuma matéria encontrada
            </h3>
            <p className="text-slate-500 text-sm mb-5">
              Tente ajustar seus filtros ou termos de busca.
            </p>
          </div>
        )}

        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
              <Folder size={32} className="text-slate-600" />
            </div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Nenhuma matéria ainda
            </h3>
            <p className="text-slate-500 text-sm mb-5">
              Crie sua primeira matéria para organizar suas anotações e decks.
            </p>
            <button onClick={() => setShowSubjectModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-xl transition-all flex items-center gap-2 text-sm">
              <Plus size={16} /> Criar matéria
            </button>
          </div>
        ) : (
          <div className={layoutView === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {filteredSubjects.map(subject => (
              <div key={subject._id}
                className={`group relative flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${layoutView === 'grid' ? 'glass flex-col justify-between h-auto min-h-[10rem]' : 'hover:scale-[1.01]'} ${isDark ? 'border-white/5 hover:border-white/10' : 'border-black/6 hover:border-black/12 shadow-sm'}`}>
                {layoutView === 'grid' && (
                  <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity pointer-events-none" style={{ backgroundColor: subject.color || '#8B5CF6' }} />
                )}
                <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0 w-full">
                  <span className="text-2xl flex-shrink-0">{subject.emoji || '📚'}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-semibold text-base leading-tight group-hover:text-blue-300 transition-colors truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{subject.name}</h3>
                    {subject.description && <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{subject.description}</p>}
                  </div>
                  {/* Edit/Delete buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-auto z-10">
                    <button onClick={(e) => { e.stopPropagation(); setEditingSubject(subject); setShowSubjectModal(true); }}
                      className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                      <Pencil size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteSubject(subject); }}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="relative z-10 flex items-center justify-between gap-2 w-full">
                  <div className="flex-1 min-w-0">
                    {subject.semester && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${isDark ? 'bg-white/8 text-slate-400' : 'bg-black/6 text-slate-500'}`}>
                        {subject.semester}
                      </span>
                    )}
                    {subject.noteCount > 0 && (
                      <p className="text-slate-500 text-xs mt-1">{subject.noteCount} aula{subject.noteCount !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/notebook/${subject._id}`); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: `${subject.color || '#3B82F6'}18`, color: subject.color || '#3B82F6' }}>
                    <Folder size={12} fill="currentColor" /> Abrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showSubjectModal && (
        <SubjectModal
          onClose={() => { setShowSubjectModal(false); setEditingSubject(null); }}
          onSaved={handleSubjectSaved}
          editing={editingSubject}
          toast={toast}
          isDark={isDark}
        />
      )}

      {confirmDeleteSubject && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-8 text-center ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Excluir matéria?</h3>
            <p className="text-slate-500 text-sm mb-6">
              A matéria "<span className="font-semibold text-white">{confirmDeleteSubject.name}</span>" e todas as suas aulas e decks associados serão removidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteSubject(null)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm border transition-all ${isDark ? 'border-white/8 text-slate-400 hover:bg-white/5' : 'border-black/8 text-slate-500'}`}>
                Cancelar
              </button>
              <button onClick={handleDeleteSubject}
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