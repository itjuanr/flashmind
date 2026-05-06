import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import {
  ChevronLeft, Loader2, Save, Paperclip, Image,
  Link2, FileText, Trash2, Check, Calendar,
  Bold, Italic, List, ListOrdered, Heading2, Heading3,
  Undo2, Redo2, Quote, Code, Minus,
} from 'lucide-react';
import api from '../services/api';

// ── Editor rico (contenteditable) ─────────────────────────────────────────────
function RichEditor({ value, onChange, isDark, placeholder }) {
  const editorRef    = useRef(null);
  const isComposing  = useRef(false);
  const initialized  = useRef(false);

  // Inicializa o conteúdo só uma vez
  useEffect(() => {
    if (editorRef.current && !initialized.current) {
      editorRef.current.innerHTML = value || '';
      initialized.current = true;
    }
  }, [value]);

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  };

  const emitChange = () => {
    if (!editorRef.current || isComposing.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const btn = (title, action, icon) => {
    const Icon = icon;
    return (
      <button key={title} title={title}
        onMouseDown={e => { e.preventDefault(); action(); }}
        className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-500 hover:text-white hover:bg-white/8' : 'text-slate-500 hover:text-slate-800 hover:bg-black/6'}`}>
        <Icon size={14}/>
      </button>
    );
  };

  const sep = (k) => <div key={k} className={`w-px h-4 mx-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`}/>;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8' : 'border-black/8'}`}>
      {/* Toolbar */}
      <div className={`flex items-center flex-wrap gap-0.5 px-3 py-2 border-b ${isDark ? 'border-white/8 bg-white/2' : 'border-black/6 bg-black/2'}`}>
        {btn('Negrito (Ctrl+B)',   () => exec('bold'),                    Bold)}
        {btn('Itálico (Ctrl+I)',   () => exec('italic'),                  Italic)}
        {sep('s1')}
        {btn('Título 2',           () => exec('formatBlock', '<h2>'),     Heading2)}
        {btn('Título 3',           () => exec('formatBlock', '<h3>'),     Heading3)}
        {sep('s2')}
        {btn('Lista',              () => exec('insertUnorderedList'),     List)}
        {btn('Lista numerada',     () => exec('insertOrderedList'),       ListOrdered)}
        {sep('s3')}
        {btn('Citação',            () => exec('formatBlock', '<blockquote>'), Quote)}
        {btn('Código',             () => exec('formatBlock', '<pre>'),    Code)}
        {btn('Linha horizontal',   () => exec('insertHorizontalRule'),   Minus)}
        {sep('s4')}
        {btn('Desfazer',           () => exec('undo'),                    Undo2)}
        {btn('Refazer',            () => exec('redo'),                    Redo2)}
      </div>

      {/* Área de texto */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; emitChange(); }}
        onKeyDown={e => {
          if (e.key === 'Tab') { e.preventDefault(); exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;'); }
        }}
        data-placeholder={placeholder}
        className={`
          min-h-[420px] p-5 outline-none text-sm leading-relaxed
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1
          [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:my-2
          [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:my-2
          [&_li]:my-0.5
          [&_blockquote]:border-l-4 [&_blockquote]:border-blue-500/60
          [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:italic [&_blockquote]:my-3
          [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-3
          [&_pre]:bg-black/30
          [&_hr]:border-white/10 [&_hr]:my-4
          [&_strong]:font-bold [&_em]:italic [&_p]:my-1.5
          empty:before:content-[attr(data-placeholder)] empty:before:text-slate-600 empty:before:pointer-events-none
          ${isDark ? 'text-slate-200' : 'text-slate-800'}
        `}
      />
    </div>
  );
}

// ── Painel de Anexos ──────────────────────────────────────────────────────────
function AttachmentsPanel({ noteId, attachments, setAttachments, isDark, toast }) {
  const [showMenu, setShowMenu] = useState(false);
  const [linkInput, setLinkInput] = useState({ show: false, url: '', name: '' });
  const fileRef = useRef();

  const handleFile = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const res = await api.post(`/notebook/notes/${noteId}/attachments`, {
          type, name: file.name, data: ev.target.result, url: null,
        });
        setAttachments(prev => [...prev, res.data]);
        toast('Anexo adicionado!', 'success');
      } catch { toast('Erro ao adicionar anexo.', 'error'); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLink = async () => {
    const url = linkInput.url.trim();
    if (!url) return;
    const isVideo = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('drive.google.com');
    try {
      const res = await api.post(`/notebook/notes/${noteId}/attachments`, {
        type: isVideo ? 'video' : 'link',
        name: linkInput.name || url,
        data: null,
        url,
      });
      setAttachments(prev => [...prev, res.data]);
      setLinkInput({ show: false, url: '', name: '' });
      toast('Link adicionado!', 'success');
    } catch { toast('Erro ao adicionar link.', 'error'); }
  };

  const handleDelete = async (att) => {
    try {
      await api.delete(`/notebook/notes/${noteId}/attachments/${att._id}`);
      setAttachments(prev => prev.filter(a => a._id !== att._id));
    } catch { toast('Erro ao remover.', 'error'); }
  };

  const typeIcon = t => ({ image:'🖼️', pdf:'📄', video:'🎬', link:'🔗' }[t] || '📎');

  return (
    <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/8 bg-white/2' : 'border-black/8 bg-black/2'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Anexos {attachments.length > 0 && <span className="text-slate-500 font-normal">({attachments.length})</span>}
        </h3>
        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${isDark ? 'border-white/8 text-slate-400 hover:text-white hover:border-white/15' : 'border-black/8 text-slate-500 hover:border-black/15'}`}>
            <Paperclip size={11}/> Adicionar
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}/>
              <div className={`absolute right-0 top-full mt-1 w-40 rounded-xl border shadow-xl z-20 overflow-hidden ${isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8'}`}>
                {[
                  { icon: Image,    label: 'Imagem', action: () => { fileRef.current.accept='image/*'; fileRef.current.dataset.type='image'; fileRef.current.click(); setShowMenu(false); }},
                  { icon: FileText, label: 'PDF',    action: () => { fileRef.current.accept='.pdf';    fileRef.current.dataset.type='pdf';   fileRef.current.click(); setShowMenu(false); }},
                  { icon: Link2,    label: 'Link / Vídeo', action: () => { setLinkInput(p=>({...p,show:true})); setShowMenu(false); }},
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm ${isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-600 hover:bg-black/4'}`}>
                    <item.icon size={13} className="text-slate-500"/> {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" className="hidden"
        onChange={e => handleFile(e, e.target.dataset.type)}/>

      {linkInput.show && (
        <div className={`mb-3 p-3 rounded-xl border space-y-2 ${isDark ? 'border-white/8 bg-white/2' : 'border-black/6'}`}>
          <input value={linkInput.url} onChange={e=>setLinkInput(p=>({...p,url:e.target.value}))}
            placeholder="URL (YouTube, Drive, site...)"
            className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${isDark ? 'bg-white/4 border-white/8 text-white placeholder-slate-600' : 'bg-black/3 border-black/8 text-slate-800 placeholder-slate-400'}`}/>
          <input value={linkInput.name} onChange={e=>setLinkInput(p=>({...p,name:e.target.value}))}
            placeholder="Nome (opcional)"
            className={`w-full px-3 py-2 rounded-lg text-xs outline-none border ${isDark ? 'bg-white/4 border-white/8 text-white placeholder-slate-600' : 'bg-black/3 border-black/8 text-slate-800 placeholder-slate-400'}`}/>
          <div className="flex gap-2">
            <button onClick={()=>setLinkInput({show:false,url:'',name:''})}
              className={`flex-1 py-1.5 rounded-lg text-xs border ${isDark ? 'border-white/8 text-slate-400' : 'border-black/8 text-slate-500'}`}>Cancelar</button>
            <button onClick={handleLink}
              className="flex-1 py-1.5 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-500">Adicionar</button>
          </div>
        </div>
      )}

      {attachments.length === 0
        ? <p className="text-slate-600 text-xs text-center py-3">Nenhum anexo</p>
        : (
          <div className="space-y-2">
            {attachments.map(att => (
              <div key={att._id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border group ${isDark ? 'border-white/5 bg-white/2' : 'border-black/5'}`}>
                {att.type==='image' && att.data
                  ? <img src={att.data} alt={att.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>
                  : <span className="text-xl flex-shrink-0">{typeIcon(att.type)}</span>
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{att.name || att.url}</p>
                  <p className="text-[10px] text-slate-500 capitalize">{att.type}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {att.url && (
                    <a href={att.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 transition-all"><Link2 size={12}/></a>
                  )}
                  <button onClick={()=>handleDelete(att)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-all"><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function NotePage() {
  const { subjectId, noteId } = useParams();
  const { theme } = useTheme();
  const isDark    = theme === 'dark';
  const navigate  = useNavigate();
  const toast     = useToast();

  const [note, setNote]         = useState(null);
  const [subject, setSubject]   = useState(null);
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [date, setDate]         = useState('');
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(true);

  // Refs para sempre ter o valor mais recente no autosave
  const titleRef   = useRef('');
  const contentRef = useRef('');
  const dateRef    = useRef('');
  const saveTimer  = useRef(null);
  const noteIdRef  = useRef(noteId);

  useEffect(() => { noteIdRef.current = noteId; }, [noteId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [nRes, sRes] = await Promise.all([
          api.get(`/notebook/notes/${noteId}`),
          api.get('/notebook/subjects'),
        ]);
        const n = nRes.data;
        const dateStr = n.date ? n.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
        setNote(n);
        setTitle(n.title || '');
        setContent(n.content || '');
        setDate(dateStr);
        setAttachments(n.attachments || []);
        // Sincroniza refs
        titleRef.current   = n.title || '';
        contentRef.current = n.content || '';
        dateRef.current    = dateStr;
        const found = sRes.data.find(s => s._id === subjectId);
        setSubject(found || null);
      } catch { toast('Erro ao carregar aula.', 'error'); }
      finally { setLoading(false); }
    };
    load();
    // Limpa timer ao desmontar
    return () => clearTimeout(saveTimer.current);
  }, [noteId, subjectId]);

  // Save sempre lê dos refs — nunca tem closure stale
  const doSave = async () => {
    setSaving(true);
    try {
      await api.put(`/notebook/notes/${noteIdRef.current}`, {
        title:   titleRef.current,
        content: contentRef.current,
        date:    dateRef.current,
      });
      setSaved(true);
    } catch { toast('Erro ao salvar.', 'error'); }
    finally { setSaving(false); }
  };

  const scheduleSave = () => {
    setSaved(false);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 1500);
  };

  const handleTitleChange = v => {
    setTitle(v);
    titleRef.current = v;
    scheduleSave();
  };

  const handleContentChange = v => {
    setContent(v);
    contentRef.current = v;
    scheduleSave();
  };

  const handleDateChange = v => {
    setDate(v);
    dateRef.current = v;
    scheduleSave();
  };

  const handleManualSave = () => {
    clearTimeout(saveTimer.current);
    doSave();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <Loader2 size={28} className="animate-spin text-slate-600"/>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] pointer-events-none"
        style={{ background: `radial-gradient(ellipse, ${subject?.color || '#8B5CF6'}10, transparent 70%)` }}/>
      <Navbar/>

      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16 relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(`/notebook/${subjectId}`)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors group">
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform"/>
            <span className="flex items-center gap-1.5">
              <span>{subject?.emoji}</span>
              <span>{subject?.name}</span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <span className={`text-xs flex items-center gap-1.5 transition-all ${
              saving ? 'text-blue-400' : saved ? 'text-emerald-400' : 'text-slate-500'
            }`}>
              {saving ? <><Loader2 size={12} className="animate-spin"/> Salvando...</>
               : saved ? <><Check size={12}/> Salvo</>
               : 'Editando...'}
            </span>
            <button onClick={handleManualSave} disabled={saving}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                isDark ? 'border-white/8 text-slate-400 hover:border-blue-500/40 hover:text-blue-400 disabled:opacity-40'
                       : 'border-black/8 text-slate-500 hover:border-blue-500/40 hover:text-blue-500 disabled:opacity-40'
              }`}>
              <Save size={12}/> Salvar agora
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

          {/* Editor */}
          <div className="space-y-4">
            {/* Título */}
            <input
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Título da aula..."
              className={`w-full text-2xl font-bold bg-transparent outline-none placeholder-slate-700 ${isDark ? 'text-white' : 'text-slate-900'}`}
            />
            {/* Data */}
            <div className={`flex items-center gap-2 pb-3 border-b ${isDark ? 'border-white/8' : 'border-black/8'}`}>
              <Calendar size={13} className="text-slate-500"/>
              <input type="date" value={date} onChange={e => handleDateChange(e.target.value)}
                className={`text-xs bg-transparent outline-none ${isDark ? 'text-slate-400' : 'text-slate-500'} [color-scheme:dark]`}/>
            </div>
            {/* Editor */}
            <RichEditor value={content} onChange={handleContentChange} isDark={isDark}
              placeholder="Comece a escrever suas anotações... Use a barra acima para formatar."/>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <AttachmentsPanel
              noteId={noteId}
              attachments={attachments}
              setAttachments={setAttachments}
              isDark={isDark}
              toast={toast}
            />

            {/* Info */}
            <div className={`rounded-2xl border p-4 space-y-2 ${isDark ? 'border-white/6 bg-white/2' : 'border-black/6'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Info</p>
              {subject?.semester && (
                <p className="text-xs text-slate-500"><span className="text-slate-400 font-medium">Semestre:</span> {subject.semester}</p>
              )}
              {note?.updatedAt && (
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400 font-medium">Editado:</span> {new Date(note.updatedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            {/* Atalhos */}
            <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/6 bg-white/2' : 'border-black/6'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Atalhos</p>
              <div className="space-y-2">
                {[['Negrito','Ctrl+B'],['Itálico','Ctrl+I'],['Desfazer','Ctrl+Z'],['Tab','Indentar']].map(([l,k])=>(
                  <div key={l} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{l}</span>
                    <kbd className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDark ? 'bg-white/8 text-slate-400' : 'bg-black/8 text-slate-500'}`}>{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}