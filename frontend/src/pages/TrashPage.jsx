import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Loader2, Trash2, RotateCcw, ArrowLeft, Layers, FileText } from 'lucide-react';
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
  const [materias, setMaterias]     = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [restaurando, setRestaurando] = useState(null);
  const [confirmar, setConfirmar]   = useState(null);
  const [apagando, setApagando]     = useState(false);

  const carregar = () => {
    setCarregando(true);
    // allSettled: uma lixeira falhar nao pode esconder a outra.
    Promise.allSettled([api.get('/decks/trash'), api.get('/notebook/subjects/trash')])
      .then(([d, m]) => {
        if (d.status === 'fulfilled') setDecks(d.value.data);
        if (m.status === 'fulfilled') setMaterias(m.value.data);
        if (d.status === 'rejected' && m.status === 'rejected')
          toast('Erro ao carregar a lixeira.', 'error');
      })
      .finally(() => setCarregando(false));
  };

  useEffect(carregar, []); // eslint-disable-line react-hooks/exhaustive-deps

  const restaurar = async (item, tipo) => {
    setRestaurando(item._id);
    const base = tipo === 'deck' ? '/decks' : '/notebook/subjects';
    try {
      await api.post(`${base}/${item._id}/restore`);
      toast(`"${item.name}" restaurado.`, 'success');
      const setter = tipo === 'deck' ? setDecks : setMaterias;
      setter((prev) => prev.filter((x) => x._id !== item._id));
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao restaurar.', 'error');
    } finally { setRestaurando(null); }
  };

  const apagarDeVez = async () => {
    setApagando(true);
    try {
      const base = confirmar.tipo === 'deck' ? '/decks' : '/notebook/subjects';
      await api.delete(`${base}/${confirmar._id}/permanent`);
      toast('Excluído definitivamente.', 'info');
      const setter = confirmar.tipo === 'deck' ? setDecks : setMaterias;
      setter((prev) => prev.filter((x) => x._id !== confirmar._id));
      setConfirmar(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao excluir.', 'error');
    } finally { setApagando(false); }
  };

  const vazia = decks.length === 0 && materias.length === 0;

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
          Decks e matérias excluídos ficam aqui com todo o conteúdo. Restaure quando quiser —
          nada é apagado de verdade até você excluir definitivamente.
        </p>

        {carregando ? (
          <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-slate-600" /></div>
        ) : vazia ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`p-5 rounded-2xl mb-5 ${isDark ? 'bg-white/4' : 'bg-black/4'}`}>
              <Trash2 size={32} className="text-slate-500" />
            </div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
              Lixeira vazia
            </h3>
            <p className="text-slate-500 text-sm">Nada por aqui — nada foi excluído.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {[
              { tipo: 'deck',    titulo: 'Decks',    itens: decks,    padrao: '📚',
                Icone: Layers,   contar: (d) => `${d.flashcardCount} card${d.flashcardCount !== 1 ? 's' : ''}` },
              { tipo: 'materia', titulo: 'Matérias', itens: materias, padrao: '📓',
                Icone: FileText, contar: (m) => `${m.noteCount} aula${m.noteCount !== 1 ? 's' : ''}` },
            ].filter((g) => g.itens.length > 0).map(({ tipo, titulo, itens, padrao, Icone, contar }) => (
              <section key={tipo}>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  {titulo} · {itens.length}
                </h2>
                <div className="space-y-3">
                  {itens.map((item) => (
                    <div key={item._id}
                      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${cardCls}`}>
                      <span className="text-2xl flex-shrink-0 leading-none">{item.emoji || padrao}</span>

                      <div className="min-w-0 flex-1">
                        <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-slate-500 flex items-center gap-1 whitespace-nowrap">
                            <Icone size={11} /> {contar(item)}
                          </span>
                          <span className="text-xs text-slate-600 whitespace-nowrap">{quandoTexto(item.deletedAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button variant="secondary" size="md" icon={RotateCcw}
                          loading={restaurando === item._id}
                          onClick={() => restaurar(item, tipo)}>
                          Restaurar
                        </Button>
                        <Button variant="danger" size="md" icon={Trash2}
                          onClick={() => setConfirmar({ ...item, tipo, resumo: contar(item) })}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
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
          {confirmar.tipo === 'deck' ? 'O deck ' : 'A matéria '}
          <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>"{confirmar.name}"</span>{' '}
          e {confirmar.resumo} serão apagados de vez. Esta ação não tem volta.
          {confirmar.tipo === 'materia' && ' Os decks da matéria são preservados, apenas perdem o vínculo.'}
        </ConfirmDialog>
      )}
    </div>
  );
}
