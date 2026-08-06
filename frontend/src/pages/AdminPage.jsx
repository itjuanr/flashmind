import { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import {
  Loader2, Search, Users, Layers, BookOpen, FolderOpen, ShieldCheck,
  ChevronLeft, ChevronRight, X, Mail, Calendar, ArrowLeft,
} from 'lucide-react';
import api from '../services/api';

const fmtData = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

function StatTile({ icon: Icon, label, value, isDark }) {
  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-white/2 border-white/8' : 'bg-white border-black/8 shadow-sm'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-blue-400 flex-shrink-0" />
        <p className="text-xs text-slate-500 uppercase tracking-widest truncate">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value ?? '—'}</p>
    </div>
  );
}

const CARGOS = [
  { value: 'user',  label: 'Usuário', desc: 'Sem acesso à área de equipe.' },
  { value: 'ti',    label: 'TI',      desc: 'Vê usuários e conteúdo. Não altera cargos.' },
  { value: 'admin', label: 'Admin',   desc: 'Acesso total, incluindo promover e rebaixar.' },
];

const badgeCargo = (role) => {
  if (role === 'admin') return { txt: 'admin', cls: 'bg-blue-500/15 text-blue-400' };
  if (role === 'ti')    return { txt: 'ti',    cls: 'bg-violet-500/15 text-violet-400' };
  return null;
};

export default function AdminPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const toast = useToast();
  const { user: eu } = useAuth();
  const souAdmin = eu?.role === 'admin';

  const [cargoModal, setCargoModal] = useState(null); // { alvo, role, senha }
  const [salvandoCargo, setSalvandoCargo] = useState(false);

  const [stats, setStats]     = useState(null);
  const [negado, setNegado]   = useState(false);
  const [busca, setBusca]     = useState('');
  const [page, setPage]       = useState(1);
  const [lista, setLista]     = useState({ usuarios: [], total: 0, pages: 1 });
  const [carregando, setCarregando] = useState(true);

  const [detalhe, setDetalhe] = useState(null);
  const [deckAberto, setDeckAberto] = useState(null);

  useEffect(() => {
    api.get('/admin/stats')
      .then((r) => setStats(r.data))
      // 404 é a resposta proposital para quem não é admin — não confirma que a área existe.
      .catch((e) => { if (e.response?.status === 404) setNegado(true); });
  }, []);

  const carregarUsuarios = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api.get('/admin/users', { params: { q: busca, page, limit: 20 } });
      setLista(r.data);
    } catch (e) {
      if (e.response?.status === 404) setNegado(true);
      else toast('Erro ao listar usuários.', 'error');
    } finally { setCarregando(false); }
  }, [busca, page, toast]);

  useEffect(() => {
    const t = setTimeout(carregarUsuarios, 300); // debounce da busca
    return () => clearTimeout(t);
  }, [carregarUsuarios]);

  const abrirUsuario = async (id) => {
    try {
      const r = await api.get(`/admin/users/${id}`);
      setDetalhe(r.data);
    } catch { toast('Erro ao carregar usuário.', 'error'); }
  };

  const salvarCargo = async (e) => {
    e.preventDefault();
    setSalvandoCargo(true);
    try {
      const r = await api.patch(`/admin/users/${cargoModal.alvo._id}/role`, {
        role: cargoModal.role, password: cargoModal.senha,
      });
      toast(r.data.message, 'success');
      setDetalhe((d) => (d ? { ...d, user: { ...d.user, role: r.data.role } } : d));
      setCargoModal(null);
      carregarUsuarios();
    } catch (err) {
      toast(err.response?.data?.message || 'Erro ao alterar cargo.', 'error');
    } finally { setSalvandoCargo(false); }
  };

  const abrirDeck = async (id) => {
    try {
      const r = await api.get(`/admin/decks/${id}`);
      setDeckAberto(r.data);
    } catch { toast('Erro ao carregar deck.', 'error'); }
  };

  if (negado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-5xl mb-2">🔒</div>
        <h1 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>Página não encontrada</h1>
        <p className="text-slate-500 text-sm">Este recurso não existe ou você não tem acesso.</p>
      </div>
    );
  }

  const cardCls = isDark ? 'bg-white/2 border-white/8' : 'bg-white border-black/8 shadow-sm';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16 relative z-10">

        {!detalhe ? (
          <>
            <div className="flex items-center gap-2 mb-8">
              <ShieldCheck size={22} className="text-blue-400 flex-shrink-0" />
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Administração
              </h1>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatTile icon={Users}      label="Usuários" value={stats?.usuarios} isDark={isDark} />
              <StatTile icon={ShieldCheck} label="Verificados" value={stats?.verificados} isDark={isDark} />
              <StatTile icon={Layers}     label="Decks"    value={stats?.decks} isDark={isDark} />
              <StatTile icon={BookOpen}   label="Cards"    value={stats?.cards} isDark={isDark} />
              <StatTile icon={FolderOpen} label="Matérias" value={stats?.materias} isDark={isDark} />
              <StatTile icon={BookOpen}   label="Aulas"    value={stats?.notas} isDark={isDark} />
              <StatTile icon={Layers}     label="Sessões"  value={stats?.sessoes} isDark={isDark} />
              <StatTile icon={Users}      label="Novos 30d" value={stats?.novos30d} isDark={isDark} />
            </div>

            <div className="relative mb-5">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text" placeholder="Buscar por nome ou e-mail..."
                value={busca}
                onChange={(e) => { setBusca(e.target.value); setPage(1); }}
                className={`w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all border ${
                  isDark ? 'bg-white/4 border-white/8 focus:border-blue-500/40 text-white placeholder-slate-600'
                         : 'bg-black/3 border-black/8 focus:border-blue-500/40 text-slate-800 placeholder-slate-400'}`}
              />
            </div>

            {carregando ? (
              <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-600" /></div>
            ) : lista.usuarios.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-16">Nenhum usuário encontrado.</p>
            ) : (
              <div className="space-y-2">
                {lista.usuarios.map((u) => (
                  <button key={u._id} onClick={() => abrirUsuario(u._id)}
                    className={`w-full text-left rounded-xl border p-4 flex items-center gap-4 transition-all ${cardCls} ${isDark ? 'hover:border-white/15' : 'hover:border-black/15'}`}>
                    {/* Iniciais na lista: o avatar é base64 e não vem no
                        payload da listagem, justamente para não inflá-la. */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{u.name}</p>
                        {badgeCargo(u.role) && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0 ${badgeCargo(u.role).cls}`}>
                            {badgeCargo(u.role).txt}
                          </span>
                        )}
                        {!u.isVerified && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase tracking-wide flex-shrink-0">não verif.</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs truncate">{u.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-slate-500">{u.deckCount} decks · {u.cardCount} cards</p>
                      <p className="text-xs text-slate-600">{fmtData(u.createdAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {lista.pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button variant="secondary" size="sm" icon={ChevronLeft}
                  disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <span className="text-xs text-slate-500">{page} de {lista.pages} · {lista.total} usuários</span>
                <Button variant="secondary" size="sm"
                  disabled={page >= lista.pages} onClick={() => setPage((p) => p + 1)}>
                  Próxima <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <button onClick={() => setDetalhe(null)}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
              <ArrowLeft size={16} /> Voltar à lista
            </button>

            <div className={`rounded-2xl border p-5 sm:p-6 mb-5 ${cardCls}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {detalhe.user.avatar ? (
                  <img src={detalhe.user.avatar} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 self-start" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0 self-start">
                    {detalhe.user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className={`text-xl font-bold break-words ${isDark ? 'text-white' : 'text-slate-900'}`}>{detalhe.user.name}</h2>
                  <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1 break-all">
                    <Mail size={13} className="flex-shrink-0" /> {detalhe.user.email}
                  </p>
                  <p className="text-slate-600 text-xs flex items-center gap-1.5 mt-1">
                    <Calendar size={12} className="flex-shrink-0" /> Desde {fmtData(detalhe.user.createdAt)}
                    {badgeCargo(detalhe.user.role) && (
                      <span className={`font-semibold ${detalhe.user.role === 'admin' ? 'text-blue-400' : 'text-violet-400'}`}>
                        · {badgeCargo(detalhe.user.role).txt}
                      </span>
                    )}
                  </p>
                </div>

                {/* Só admin promove. Um TI vê a tela, mas não este botão — e,
                    se forçar a chamada, o adminOnly da rota barra. */}
                {souAdmin && detalhe.user._id !== eu?.id && (
                  <Button variant="secondary" size="md" icon={ShieldCheck} className="flex-shrink-0 self-start"
                    onClick={() => setCargoModal({ alvo: detalhe.user, role: detalhe.user.role || 'user', senha: '' })}>
                    Alterar cargo
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <StatTile icon={Layers}     label="Decks"    value={detalhe.totais.decks} isDark={isDark} />
              <StatTile icon={BookOpen}   label="Cards"    value={detalhe.totais.cards} isDark={isDark} />
              <StatTile icon={FolderOpen} label="Matérias" value={detalhe.totais.materias} isDark={isDark} />
              <StatTile icon={BookOpen}   label="Aulas"    value={detalhe.totais.notas} isDark={isDark} />
              <StatTile icon={Layers}     label="Sessões"  value={detalhe.totais.sessoes} isDark={isDark} />
            </div>

            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Decks</h3>
            {detalhe.decks.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 text-center">Nenhum deck.</p>
            ) : (
              <div className="space-y-2">
                {detalhe.decks.map((d) => (
                  <button key={d._id} onClick={() => abrirDeck(d._id)}
                    className={`w-full text-left rounded-xl border p-4 flex items-center gap-3 transition-all ${cardCls} ${isDark ? 'hover:border-white/15' : 'hover:border-black/15'}`}>
                    <span className="text-xl flex-shrink-0">{d.emoji || '📚'}</span>
                    <p className={`font-medium text-sm truncate flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{d.name}</p>
                    <span className="text-xs text-slate-500 flex-shrink-0">{d.flashcardCount} cards</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {cargoModal && (
        <Modal onClose={() => !salvandoCargo && setCargoModal(null)} size="sm" dismissable={!salvandoCargo}>
          <form onSubmit={salvarCargo} className="p-6 sm:p-8">
            <h3 className={`font-bold text-lg mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Alterar cargo</h3>
            <p className="text-slate-500 text-sm mb-5 break-words">{cargoModal.alvo.name} · {cargoModal.alvo.email}</p>

            <div className="space-y-2 mb-5">
              {CARGOS.map((c) => (
                <button key={c.value} type="button"
                  onClick={() => setCargoModal((m) => ({ ...m, role: c.value }))}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    cargoModal.role === c.value
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : isDark ? 'border-white/8 hover:border-white/15' : 'border-black/8 hover:border-black/15'
                  }`}>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{c.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2" htmlFor="admin-senha">
              Confirme com a sua senha
            </label>
            <input id="admin-senha" type="password" required autoComplete="current-password"
              value={cargoModal.senha}
              onChange={(e) => setCargoModal((m) => ({ ...m, senha: e.target.value }))}
              className={`w-full border px-4 py-3 rounded-lg outline-none transition-all text-sm mb-2 ${
                isDark ? 'bg-white/4 border-white/8 focus:border-blue-500/50 text-white'
                       : 'bg-black/3 border-black/8 focus:border-blue-500/50 text-slate-800'}`} />
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Conceder privilégio é a ação mais sensível do sistema — a senha impede que uma sessão sequestrada crie um admin.
            </p>

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button type="button" variant="secondary" size="lg" fullWidth
                disabled={salvandoCargo} onClick={() => setCargoModal(null)}>Cancelar</Button>
              <Button type="submit" variant="primary" size="lg" fullWidth loading={salvandoCargo}
                disabled={cargoModal.role === cargoModal.alvo.role}>Salvar cargo</Button>
            </div>
          </form>
        </Modal>
      )}

      {deckAberto && (
        <Modal onClose={() => setDeckAberto(null)} size="3xl">
          <div className="flex flex-col" style={{ maxHeight: '85vh' }}>
            <div className={`flex items-center justify-between px-6 pt-6 pb-4 border-b flex-shrink-0 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
              <div className="min-w-0">
                <h2 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {deckAberto.deck.emoji} {deckAberto.deck.name}
                </h2>
                <p className="text-slate-500 text-xs truncate">
                  {deckAberto.dono?.name} · {deckAberto.cards.length} cards
                </p>
              </div>
              <button type="button" onClick={() => setDeckAberto(null)} aria-label="Fechar"
                className="text-slate-500 hover:text-slate-300 flex-shrink-0"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-2">
              {deckAberto.cards.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Deck sem cards.</p>
              ) : deckAberto.cards.map((c) => (
                <div key={c._id} className={`rounded-lg border p-3 flex gap-4 ${isDark ? 'border-white/6' : 'border-black/6'}`}>
                  <p className={`flex-1 min-w-0 text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {c.front || <span className="text-slate-600 italic">— só mídia —</span>}
                  </p>
                  <div className={`w-px flex-shrink-0 ${isDark ? 'bg-white/6' : 'bg-black/6'}`} />
                  <p className="flex-1 min-w-0 text-sm text-slate-400">
                    {c.back || <span className="text-slate-600 italic">— só mídia —</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
