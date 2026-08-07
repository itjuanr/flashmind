import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Loader2, Trash2, RotateCcw, ArrowLeft, Layers } from 'lucide-react';
import api from '../services/api';

const diasDesde = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

function quandoTexto(d) {
  const dias = diasDesde(d);
  if (dias <= 0) return 'excluído hoje';
  if (dias === 1) return 'excluído ontem';
  return `excluído há ${dias} dias`;
}

export default function TrashPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const toast = useToast();
  const navigate = useNavigate();

  const [decks, setDecks]           = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [restaurando, setRestaurando] = useState(null);
  const [confirmar, setConfirmar]   = useState(null);
  const [apagando, setApagando]     = useState(false);

  const carregar = () => {
    setCarregando(true);
    api.get('/decks/trash')
      .then((r) => setDecks(r.data))
      .catch(() => toast('Erro ao carregar a lixeira.', 'error'))
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restaurar = async (deck) => {
    setRestaurando(deck._id);
    try {
      await api.post(`/decks/${deck._id}/restore`);
      toast(`"${deck.name}" voltou para os seus decks.`, 'success');
      setDecks((prev) => prev.filter((d) => d._id !== deck._id));
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao restaurar.', 'error');
    } finally { setRestaurando(null); }
  };

  const apagarDeVez = async () => {
    setApagando(true);
    try {
      await api.delete(`/decks/${confirmar._id}/permanent`);
      toast('Deck excluído definitivamente.', 'info');
      setDecks((prev) => prev.filter((d) => d._id !== confirmar._id));
      setConfirmar(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao excluir.', 'error');
    } finally { setApagando(false); }
  };

  const cardCls = isDark ? 'bg-white/2 border-white/8' : 'bg-white border-black/8 shadow-sm';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 pt-28 pb-16 relative z-10">

        <button onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Voltar aos decks
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Trash2 size={22} className="text-slate-500 flex-shrink-0" />
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Lixeira
          </h1>
        </div>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed">
          Decks excluídos ficam aqui com todos os seus cards. Restaure quando quiser —
          nada é apagado de verdade até você excluir definitivamente.
        </p>

        {carregando ? (
          <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-slate-600" /></div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
              <Trash2 size={32} className="text-slate-500" />
            </div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Lixeira vazia
            </h3>
            <p className="text-slate-500 text-sm">Nada por aqui — nenhum deck excluído.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => (
              <div key={deck._id}
                className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${cardCls}`}>
                <span className="text-2xl flex-shrink-0 leading-none">{deck.emoji || '📚'}</span>

                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {deck.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                      <Layers size={11} /> {deck.flashcardCount} card{deck.flashcardCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-slate-600 whitespace-nowrap">{quandoTexto(deck.deletedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="secondary" size="md" icon={RotateCcw}
                    loading={restaurando === deck._id}
                    onClick={() => restaurar(deck)}>
                    Restaurar
                  </Button>
                  <Button variant="danger" size="md" icon={Trash2}
                    onClick={() => setConfirmar(deck)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {confirmar && (
        <ConfirmDialog
          emoji="🗑️"
          title="Excluir definitivamente?"
          confirmLabel="Excluir para sempre"
          loadingLabel="Excluindo..."
          loading={apagando}
          onCancel={() => setConfirmar(null)}
          onConfirm={apagarDeVez}
        >
          O deck <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>"{confirmar.name}"</span>{' '}
          e seus {confirmar.flashcardCount} card{confirmar.flashcardCount !== 1 ? 's' : ''} serão apagados de vez.
          Esta ação não tem volta.
        </ConfirmDialog>
      )}
    </div>
  );
}
