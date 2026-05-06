import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import {
  BookOpen, Plus, ChevronRight, Trash2, Edit3, X, Check,
  Loader2, GraduationCap, Search, MoreVertical,
} from 'lucide-react';
import api from '../services/api';

const COLORS = ['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#F97316'];
const EMOJIS = ['📓','📚','🔬','⚙️','🧮','🏭','💡','📐','🔭','🧪','📊','🖥️'];

function SubjectModal({ isDark, onClose, onSaved, editing }) {
  const [name, setName]         = useState(editing?.name || '');
  const [semester, setSemester] = useState(editing?.semester || '');
  const [color, setColor]       = useState(editing?.color || COLORS[0]);
  const [emoji, setEmoji]       = useState(editing?.emoji || '📓');
  const [desc, setDesc]         = useState(editing?.description || '');
  const [saving, setSaving]     = useState(false);
  const toast = useToast();

  const handleSave = async () => {
    if (!name.trim()) { toast('Adicione um nome.', 'error'); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), semester: semester.trim(), color, emoji, description: desc.trim() };
      const res = editing
        ? await api.put(`/notebook/subjects/${editing._id}`, payload)
        : await api.post('/notebook/subjects', payload);
      onSaved(res.data, !!editing);
      onClose();
    } catch (e) { toast(e.response?.data?.message || 'Erro ao salvar.', 'error'); }
    finally { setSaving(false); }
  };

  const inp = `w-full px-4 py-3 rounded-xl outline-none text-sm transition-all border ${
    isDark ? 'bg-white/4 border-white/8 focus:border-blue-500/50 text-white placeholder-slate-600'
           : 'bg-black/3 border-black/8 focus:border-blue-500/40 text-slate-800 placeholder-slate-400'
  }`;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-3xl border shadow-2xl ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'} p-7`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {editing ? 'Editar matéria' : 'Nova matéria'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={20}/></button>
        </div>

        <div className="space-y-4">
          {/* Emoji + Nome */}
          <div className="flex gap-3">
            <div className="relative">
              <button className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center border ${isDark ? 'border-white/8 bg-white/4' : 'border-black/8 bg-black/3'}`}
                onClick={() => {}}>
                {emoji}
              </button>
            </div>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nome da matéria *"
              className={`${inp} flex-1`} autoFocus/>
          </div>

          {/* Emojis */}
          <div className="flex gap-2 flex-wrap">
            {EMOJIS.map(e => (
              <button key={e} onClick={()=>setEmoji(e)}
                className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                  emoji===e ? 'bg-blue-500/20 ring-2 ring-blue-500/40' : isDark ? 'hover:bg-white/8' : 'hover:bg-black/6'
                }`}>{e}</button>
            ))}
          </div>

          {/* Semestre */}
          <input value={semester} onChange={e=>setSemester(e.target.value)}
            placeholder="Semestre (ex: 2025/1)" className={inp}/>

          {/* Descrição */}
          <textarea value={desc} onChange={e=>setDesc(e.target.value)}
            placeholder="Descrição (opcional)" rows={2}
            className={`${inp} resize-none`}/>

          {/* Cores */}
          <div>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Cor</p>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={()=>setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color===c ? 'ring-2 ring-offset-2 ring-offset-transparent scale-110' : ''}`}
                  style={{ backgroundColor: c, ringColor: c }}/>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className={`flex-1 py-3 rounded-xl font-semibold text-sm border transition-all ${isDark ? 'border-white/8 text-slate-400 hover:bg-white/5' : 'border-black/8 text-slate-500 hover:bg-black/4'}`}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white transition-all flex items-center justify-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Check size={15}/>}
            {editing ? 'Salvar' : 'Criar matéria'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotebookPage() {
  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const navigate  = useNavigate();
  const toast     = useToast();

  const [subjects, setSubjects]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState(null);
  const [search, setSearch]             = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [menuOpen, setMenuOpen]         = useState(null);
  const menuRef = useRef();

  useEffect(() => {
    api.get('/notebook/subjects')
      .then(r => setSubjects(r.data))
      .catch(() => toast('Erro ao carregar matérias.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSaved = (subject, isEdit) => {
    if (isEdit) setSubjects(prev => prev.map(s => s._id === subject._id ? subject : s));
    else setSubjects(prev => [subject, ...prev]);
    toast(isEdit ? 'Matéria atualizada!' : 'Matéria criada!', 'success');
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/notebook/subjects/${confirmDelete._id}`);
      setSubjects(prev => prev.filter(s => s._id !== confirmDelete._id));
      toast('Matéria removida.', 'success');
    } catch { toast('Erro ao remover.', 'error'); }
    setConfirmDelete(null);
  };

  // Agrupa por semestre
  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.semester||'').toLowerCase().includes(search.toLowerCase())
  );
  const grouped = filtered.reduce((acc, s) => {
    const key = s.semester || 'Sem semestre';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});
  const semesters = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none"/>
      <Navbar/>

      <main className="max-w-4xl mx-auto px-4 pt-28 pb-16 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-purple-500/15">
                <GraduationCap size={22} className="text-purple-400"/>
              </div>
              <h1 className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Caderno</h1>
            </div>
            <p className="text-slate-500 text-sm ml-1">Suas anotações de aula organizadas por matéria</p>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            <Plus size={16}/> Nova matéria
          </button>
        </div>

        {/* Busca */}
        {subjects.length > 0 && (
          <div className="relative mb-8 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar matérias..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-all ${
                isDark ? 'bg-white/4 border-white/8 focus:border-purple-500/40 text-white placeholder-slate-600'
                       : 'bg-black/3 border-black/8 focus:border-purple-500/40 text-slate-800 placeholder-slate-400'
              }`}/>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-slate-600"/></div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className={`p-6 rounded-3xl mb-6 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
              <BookOpen size={40} className="text-slate-600"/>
            </div>
            <h3 className={`font-bold text-xl mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Caderno vazio</h3>
            <p className="text-slate-500 mb-6 text-sm max-w-xs">Crie sua primeira matéria para começar a organizar suas aulas.</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all">
              <Plus size={15}/> Criar primeira matéria
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {semesters.map(semester => (
              <div key={semester}>
                {/* Título do semestre */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-px flex-1 ${isDark ? 'bg-white/8' : 'bg-black/8'}`}/>
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                    isDark ? 'bg-white/5 text-slate-500' : 'bg-black/5 text-slate-400'
                  }`}>{semester}</span>
                  <div className={`h-px flex-1 ${isDark ? 'bg-white/8' : 'bg-black/8'}`}/>
                </div>

                {/* Cards de matéria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[semester].map(subject => (
                    <div key={subject._id}
                      onClick={() => navigate(`/notebook/${subject._id}`)}
                      className={`group relative rounded-2xl border p-5 cursor-pointer transition-all hover:scale-[1.02] ${
                        isDark ? 'bg-[#12121E] border-white/8 hover:border-white/15' : 'bg-white border-black/8 hover:border-black/15 shadow-sm'
                      }`}>
                      {/* Barra de cor */}
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: subject.color }}/>

                      {/* Menu */}
                      <div className="absolute top-3 right-3" ref={menuOpen === subject._id ? menuRef : null}>
                        <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === subject._id ? null : subject._id); }}
                          className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'hover:bg-white/10 text-slate-500' : 'hover:bg-black/8 text-slate-400'}`}>
                          <MoreVertical size={14}/>
                        </button>
                        {menuOpen === subject._id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setMenuOpen(null); }}/>
                            <div className={`absolute right-0 top-full mt-1 w-40 rounded-xl border shadow-xl z-20 overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
                              <button onClick={e => { e.stopPropagation(); setEditing(subject); setShowModal(true); setMenuOpen(null); }}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-600 hover:bg-black/4'}`}>
                                <Edit3 size={13}/> Editar
                              </button>
                              <button onClick={e => { e.stopPropagation(); setConfirmDelete(subject); setMenuOpen(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                <Trash2 size={13}/> Excluir
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-start gap-3 mt-1">
                        <span className="text-3xl">{subject.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{subject.name}</h3>
                          {subject.description && (
                            <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{subject.description}</p>
                          )}
                        </div>
                      </div>

                      <div className={`flex items-center justify-between mt-4 pt-3 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                        <span className="text-slate-500 text-xs">{subject.noteCount || 0} aula{subject.noteCount !== 1 ? 's' : ''}</span>
                        <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors"/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <SubjectModal isDark={isDark} onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved} editing={editing}/>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl border p-8 text-center ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Excluir matéria?</h3>
            <p className="text-slate-500 text-sm mb-6">Todas as aulas e anotações de <span className="font-semibold text-white">"{confirmDelete.name}"</span> serão removidas permanentemente.</p>
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