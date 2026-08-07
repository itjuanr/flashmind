const crypto    = require('crypto');
const { gerarToken, hashToken } = require('../utils/tokens');
const bcrypt    = require('bcryptjs');
const User      = require('../models/User');
const { sendPasswordResetEmail, sendEmailChangeConfirmation, sendEmailChangeNotice } = require('../config/email');
const Deck      = require('../models/Deck');
const Flashcard = require('../models/Flashcard');
const Subject   = require('../models/Subject');
const Note      = require('../models/Note');
const StudySession = require('../models/StudySession');
const AdminLog  = require('../models/AdminLog');

/**
 * Registra a acao sem deixar que uma falha de log derrube a operacao ja
 * concluida — mas avisa alto no console se falhar, porque perder trilha de
 * auditoria e um problema por si so.
 */
async function auditar(req, { acao, alvo, detalhe }) {
  try {
    await AdminLog.create({
      autorId: req.user.id, autorEmail: req.user.email,
      acao,
      alvoId: alvo?._id, alvoEmail: alvo?.email,
      detalhe: detalhe || '',
      ip: req.ip || '',
    });
  } catch (e) {
    console.error('[AUDITORIA] FALHA ao registrar', acao, e.message);
  }
}

// Projeção única para qualquer leitura de usuário nesta área.
// `password` já é select:false no schema, mas os tokens NÃO são — sem excluí-los
// aqui, um admin (ou um log) veria tokens ativos de reset e de troca de e-mail,
// que permitem sequestrar a conta alheia. pendingEmail idem, é dado sensível.
const SAFE_USER = '-password -verifyToken -verifyTokenExpires -resetToken -resetTokenExpires -emailChangeToken -emailChangeExpires -emailChangeCancelToken';

// Na listagem o avatar sai fora: é um data URI de até ~2,8MB por usuário, e
// 20 por página significaria dezenas de MB numa resposta só. A lista mostra
// iniciais; a foto aparece no detalhe, onde é um usuário de cada vez.
const SAFE_USER_LISTA = SAFE_USER + ' -avatar';

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const desde30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [usuarios, verificados, novos30d, decks, cards, materias, notas, sessoes] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ createdAt: { $gte: desde30d } }),
      Deck.countDocuments(),
      Flashcard.countDocuments(),
      Subject.countDocuments(),
      Note.countDocuments(),
      StudySession.countDocuments(),
    ]);

    res.json({ usuarios, verificados, novos30d, decks, cards, materias, notas, sessoes });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao carregar estatísticas.' });
  }
};

// GET /api/admin/users?q=&page=&limit=
exports.listUsers = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const q     = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';

    const filtro = {};
    if (q) {
      // Escapa a entrada: sem isso, uma busca como "(" derruba a query e um
      // padrão custoso vira negação de serviço.
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filtro.$or = [
        { name:  new RegExp(safe, 'i') },
        { email: new RegExp(safe, 'i') },
      ];
    }

    const [usuarios, total] = await Promise.all([
      User.find(filtro).select(SAFE_USER_LISTA).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filtro),
    ]);

    // Contagens por usuário em duas agregações, em vez de N consultas por linha.
    const ids = usuarios.map((u) => u._id);
    const [porDeck, porCard] = await Promise.all([
      Deck.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: '$userId', total: { $sum: 1 } } }]),
      Flashcard.aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: '$userId', total: { $sum: 1 } } }]),
    ]);
    const mapDeck = new Map(porDeck.map((d) => [d._id.toString(), d.total]));
    const mapCard = new Map(porCard.map((c) => [c._id.toString(), c.total]));

    res.json({
      usuarios: usuarios.map((u) => ({
        ...u,
        deckCount: mapDeck.get(u._id.toString()) || 0,
        cardCount: mapCard.get(u._id.toString()) || 0,
      })),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao listar usuários.' });
  }
};

// GET /api/admin/users/:id
exports.getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(SAFE_USER).lean();
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const [decks, materias, notas, sessoes, cards] = await Promise.all([
      Deck.find({ userId: user._id }).select('name emoji color tags createdAt subjectId').sort({ createdAt: -1 }).lean(),
      Subject.find({ userId: user._id }).select('name emoji semester createdAt').sort({ createdAt: -1 }).lean(),
      Note.countDocuments({ userId: user._id }),
      StudySession.countDocuments({ userId: user._id }),
      Flashcard.countDocuments({ userId: user._id }),
    ]);

    const contagens = decks.length
      ? await Flashcard.aggregate([
          { $match: { deckId: { $in: decks.map((d) => d._id) } } },
          { $group: { _id: '$deckId', total: { $sum: 1 } } },
        ])
      : [];
    const mapa = new Map(contagens.map((c) => [c._id.toString(), c.total]));

    res.json({
      user,
      decks: decks.map((d) => ({ ...d, flashcardCount: mapa.get(d._id.toString()) || 0 })),
      materias,
      totais: { decks: decks.length, cards, materias: materias.length, notas, sessoes },
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao carregar usuário.' });
  }
};

// PATCH /api/admin/users/:id/role   { role, password }
// Exclusivo de admin (a rota usa adminOnly, não staffOnly).
exports.setUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!['user', 'ti', 'admin'].includes(role))
      return res.status(400).json({ message: 'Cargo inválido.' });

    // Conceder privilégio é a ação mais sensível do sistema: uma sessão
    // sequestrada poderia criar um admin permanente. Exigir a senha de quem
    // promove fecha essa porta.
    const requisitante = await User.findById(req.user.id).select('+password');
    if (!requisitante) return res.status(401).json({ message: 'Não autorizado.' });

    const bcrypt = require('bcryptjs');
    if (!(await bcrypt.compare(password, requisitante.password)))
      return res.status(400).json({ message: 'Senha incorreta.' });

    // Ninguém muda o próprio cargo — evita autorrebaixamento acidental e
    // impede que o último admin se tranque para fora sozinho.
    if (req.params.id === req.user.id)
      return res.status(400).json({ message: 'Você não pode alterar o seu próprio cargo.' });

    const alvo = await User.findById(req.params.id);
    if (!alvo) return res.status(404).json({ message: 'Usuário não encontrado.' });

    if (alvo.role === role)
      return res.status(400).json({ message: `Este usuário já é ${role}.` });

    // Rebaixar o último admin deixaria o sistema sem ninguém capaz de promover.
    if (alvo.role === 'admin' && role !== 'admin') {
      const admins = await User.countDocuments({ role: 'admin' });
      if (admins <= 1)
        return res.status(400).json({ message: 'Este é o último administrador. Promova outro antes de rebaixá-lo.' });
    }

    const anterior = alvo.role;
    alvo.role = role;
    await alvo.save();

    await auditar(req, { acao: 'cargo', alvo, detalhe: `${anterior} -> ${role}` });

    res.json({ message: `Cargo alterado para ${role}.`, role: alvo.role });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao alterar cargo.' });
  }
};

// POST /api/admin/users/:id/reset-password
// Dispara o fluxo normal de "esqueci minha senha" para o usuário.
// Liberado para TI: é a ação clássica de suporte e não dá poder a quem dispara
// — o link vai para o e-mail do próprio usuário e o token nunca é exposto aqui.
exports.triggerPasswordReset = async (req, res) => {
  try {
    const alvo = await User.findById(req.params.id);
    if (!alvo) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const token = gerarToken();
    alvo.resetToken        = hashToken(token);
    alvo.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await alvo.save();

    await auditar(req, { acao: 'reset-senha', alvo });
    res.json({ message: `Link de redefinição enviado para ${alvo.email}.` });

    setImmediate(() => {
      sendPasswordResetEmail(alvo, token)
        .catch((e) => console.error('Erro ao enviar reset (admin):', e.message));
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao disparar redefinição.' });
  }
};

// POST /api/admin/users/:id/change-email   { newEmail, password }
// Exclusivo de admin. Não troca o e-mail direto: deixa pendente até o dono
// confirmar pelo link, exatamente como na troca feita pelo próprio usuário.
exports.adminChangeEmail = async (req, res) => {
  try {
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const newEmail = typeof req.body.newEmail === 'string'
      ? req.body.newEmail.replace(/[\x00-\x1F\x7F]/g, '').trim().toLowerCase().slice(0, 200) : '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
      return res.status(400).json({ message: 'E-mail inválido.' });

    // Trocar e-mail é a via mais curta para tomar uma conta: aponte para um
    // endereço seu, confirme e peça reset. A senha do admin impede que uma
    // sessão sequestrada faça isso sozinha.
    const requisitante = await User.findById(req.user.id).select('+password');
    if (!requisitante) return res.status(401).json({ message: 'Não autorizado.' });
    if (!(await bcrypt.compare(password, requisitante.password)))
      return res.status(400).json({ message: 'Senha incorreta.' });

    const alvo = await User.findById(req.params.id);
    if (!alvo) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Contas de admin ficam fora: são as de maior valor, e permitir que um
    // admin redirecione o e-mail de outro transforma qualquer comprometimento
    // em escalada para o sistema inteiro.
    if (alvo.role === 'admin' && alvo._id.toString() !== req.user.id)
      return res.status(400).json({ message: 'Não é possível alterar o e-mail de outro administrador.' });

    if (newEmail === alvo.email)
      return res.status(400).json({ message: 'Este já é o e-mail do usuário.' });

    const taken = await User.findOne({ email: newEmail, _id: { $ne: alvo._id } });
    if (taken) return res.status(400).json({ message: 'Este e-mail já está em uso.' });

    // Isto é uma SOLICITAÇÃO, não uma troca. O admin não tem como concluí-la:
    // o e-mail só muda quando o link enviado ao novo endereço for aberto, e o
    // endereço antigo pode vetar a qualquer momento até lá.
    const token = gerarToken();
    const cancelToken = gerarToken();
    alvo.pendingEmail           = newEmail;
    alvo.emailChangeToken       = hashToken(token);
    alvo.emailChangeExpires     = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h: suporte leva tempo
    alvo.emailChangeCancelToken = hashToken(cancelToken);
    alvo.emailChangeRequestedBy = req.user.email;
    await alvo.save();

    await auditar(req, { acao: 'troca-email', alvo, detalhe: `-> ${newEmail}` });
    res.json({
      message: `Solicitação aberta. Confirmação enviada para ${newEmail} e aviso com opção de cancelar para ${alvo.email}.`,
      pendingEmail: newEmail,
    });

    const enderecoAntigo = alvo.email;
    setImmediate(() => {
      sendEmailChangeConfirmation(alvo, newEmail, token)
        .catch((e) => console.error('Erro ao enviar confirmação (admin):', e.message));
      // Aviso com veto ao endereço antigo, identificando QUEM abriu o pedido.
      // É o que impede um admin de trocar o e-mail de alguém em silêncio.
      sendEmailChangeNotice({ name: alvo.name, email: enderecoAntigo }, newEmail, cancelToken, req.user.email)
        .catch((e) => console.error('Erro ao avisar e-mail antigo (admin):', e.message));
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao solicitar troca de e-mail.' });
  }
};

// GET /api/admin/decks/:id
// Conteúdo de um deck alheio — leitura apenas.
exports.getDeckDetail = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id).lean();
    if (!deck) return res.status(404).json({ message: 'Deck não encontrado.' });

    const dono = await User.findById(deck.userId).select('name email').lean();
    // Sem áudio/imagem: payloads em base64 tornariam a resposta enorme.
    const cards = await Flashcard.find({ deckId: deck._id })
      .select('front back notes createdAt').sort({ position: 1 }).limit(500).lean();

    res.json({ deck, dono, cards });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao carregar deck.' });
  }
};

// GET /api/admin/logs
// Leitura liberada para TI: transparência sobre o que a equipe fez ajuda mais
// do que esconder — e o log não contém segredo nenhum.
exports.getLogs = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const logs = await AdminLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json(logs);
  } catch (e) {
    res.status(500).json({ message: 'Erro ao carregar o histórico.' });
  }
};
