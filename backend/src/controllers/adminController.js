const User      = require('../models/User');
const Deck      = require('../models/Deck');
const Flashcard = require('../models/Flashcard');
const Subject   = require('../models/Subject');
const Note      = require('../models/Note');
const StudySession = require('../models/StudySession');

// Projeção única para qualquer leitura de usuário nesta área.
// `password` já é select:false no schema, mas os tokens NÃO são — sem excluí-los
// aqui, um admin (ou um log) veria tokens ativos de reset e de troca de e-mail,
// que permitem sequestrar a conta alheia. pendingEmail idem, é dado sensível.
const SAFE_USER = '-password -verifyToken -verifyTokenExpires -resetToken -resetTokenExpires -emailChangeToken -emailChangeExpires';

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
      User.find(filtro).select(SAFE_USER).sort({ createdAt: -1 })
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

    // Trilha de auditoria: mudança de privilégio precisa ficar registrada.
    console.log(`[ADMIN] ${req.user.email} alterou ${alvo.email}: ${anterior} -> ${role}`);

    res.json({ message: `Cargo alterado para ${role}.`, role: alvo.role });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao alterar cargo.' });
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
