import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { Loader2, Copy, Check, Download, FolderOpen, Layers } from 'lucide-react';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import api from '../services/api';

export default function SharedSubjectPage() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const toast      = useToast();
  const { theme }  = useTheme();
  const isDark     = theme === 'dark';

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get(`/notebook/subjects/share/${token}`)
      .then((r) => setData(r.data))
      .catch(() => setError('Link inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleClone = async () => {
    if (!user) {
      toast('Faça login ou crie uma conta para salvar esta matéria.', 'info');
      navigate('/login', { state: { from: `/share/subject/${token}` } });
      return;
    }
    setCloning(true);
    try {
      const res = await api.post(`/notebook/subjects/share/${token}/clone`);
      const { clonedDecks, clonedCards, subject } = res.data;
      toast(`"${subject.name}" salva com ${clonedDecks} deck${clonedDecks !== 1 ? 's' : ''} e ${clonedCards} card${clonedCards !== 1 ? 's' : ''}!`, 'success');
      navigate(`/notebook/${subject._id}`);
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao salvar matéria.', 'error');
    } finally {
      setCloning(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <Loader2 size={28} className="animate-spin text-slate-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="text-5xl mb-2">🔒</div>
      <h1 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Link inválido</h1>
      <p className="text-slate-500 text-sm">{error}</p>
      <button onClick={() => navigate('/')} className="mt-4 text-blue-400 text-sm hover:underline">Ir para o início</button>
    </div>
  );

  const { subject, decks, totalCards, previewCards } = data;
  const accent = subject.color || '#3B82F6';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[120px] rounded-full pointer-events-none"
        style={{ backgroundColor: `${accent}0D` }} />

      {user ? <Navbar /> : (
        <header className="flex justify-between items-center px-6 py-6 max-w-6xl mx-auto w-full relative z-20">
          <div className="flex items-center gap-2">
            <img src="https://i.imgur.com/jXDsNEh.png" alt="FlashMind Logo" className="w-12 h-12 object-contain" />
            <span className={`font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Flash<span className="text-blue-400">Mind</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login', { state: { from: `/share/subject/${token}` } })}
              className={`text-sm font-medium px-4 py-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'}`}>
              Entrar
            </button>
            <button onClick={() => navigate('/register', { state: { from: `/share/subject/${token}` } })}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.25)]">
              Criar conta
            </button>
          </div>
        </header>
      )}

      <main className={`max-w-2xl mx-auto px-6 pb-16 relative z-10 w-full flex-1 ${user ? 'pt-28' : 'pt-10'}`}>
        {/* Cabeçalho da matéria */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            <FolderOpen size={12} /> Matéria compartilhada
          </div>
          <div className="text-5xl mb-4">{subject.emoji || '📓'}</div>
          <h1 className={`text-3xl font-bold tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{subject.name}</h1>
          {subject.description && <p className="text-slate-500 text-sm mb-3">{subject.description}</p>}
          {subject.semester && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block mb-3 ${isDark ? 'bg-white/8 text-slate-400' : 'bg-black/6 text-slate-500'}`}>
              {subject.semester}
            </span>
          )}
          <p className="text-slate-600 text-sm">
            {decks.length} deck{decks.length !== 1 ? 's' : ''} · {totalCards} flashcard{totalCards !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Ações */}
        <div className="flex gap-3 mb-10">
          <Button variant="primary" size="lg" fullWidth loading={cloning}
            icon={cloning ? undefined : Download} onClick={handleClone}>
            {cloning ? 'Salvando...' : user ? 'Adicionar ao meu FlashMind' : 'Entrar para salvar'}
          </Button>
          <Button variant="secondary" size="lg" onClick={copyLink}
            icon={copied ? Check : Copy}>
            {copied ? 'Copiado!' : 'Copiar link'}
          </Button>
        </div>

        {/* Decks incluídos */}
        <div className="mb-10">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
            Decks incluídos
          </h2>
          {decks.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">Esta matéria ainda não tem decks.</p>
          ) : (
            <div className="space-y-3">
              {decks.map((deck) => (
                <div key={deck._id}
                  className={`glass rounded-xl border p-4 flex items-center gap-4 ${isDark ? 'border-white/5' : 'border-black/6'}`}>
                  <span className="text-2xl flex-shrink-0 leading-none">{deck.emoji || '📚'}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{deck.name}</p>
                    {deck.description && <p className="text-slate-500 text-xs truncate mt-0.5">{deck.description}</p>}
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">
                    <Layers size={12} /> {deck.flashcardCount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prévia dos cards */}
        {previewCards.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Prévia dos cards</h2>
            {previewCards.map((card) => (
              <div key={card._id} className={`glass rounded-xl border p-4 flex gap-4 ${isDark ? 'border-white/5' : 'border-black/6'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1">Frente</p>
                  <p className={`text-sm leading-relaxed line-clamp-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {card.front || <span className="text-slate-600 italic">— só mídia —</span>}
                  </p>
                </div>
                <div className={`w-px flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-black/6'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-500/50 font-semibold uppercase tracking-widest mb-1">Verso</p>
                  <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                    {card.back || <span className="text-slate-600 italic">— só mídia —</span>}
                  </p>
                </div>
              </div>
            ))}
            {totalCards > previewCards.length && (
              <p className="text-center text-slate-600 text-sm py-2">
                + {totalCards - previewCards.length} cards não exibidos
              </p>
            )}
          </div>
        )}

        {!user && (
          <div className="mt-10 text-center">
            <a href="/" className="text-blue-400 text-sm hover:underline">Ir para a página inicial do FlashMind</a>
          </div>
        )}
      </main>
    </div>
  );
}
