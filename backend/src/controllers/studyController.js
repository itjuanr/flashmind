const StudySession = require('../models/StudySession');
const Flashcard = require('../models/Flashcard');

// @desc    Salvar sessão ao finalizar modo estudo
// @route   POST /api/study/session
exports.saveSession = async (req, res) => {
  try {
    const { deckId, totalCards, correct, wrong } = req.body;

    if (!totalCards || totalCards === 0) {
      return res.status(400).json({ message: 'Sessão inválida.' });
    }

    const session = await StudySession.create({
      userId: req.user.id,
      deckId,
      totalCards,
      correct,
      wrong,
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao salvar sessão.', error: error.message });
  }
};

// @desc    Stats do dashboard: estudados hoje + taxa de acerto geral
// @route   GET /api/study/stats
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaySessions = await StudySession.find({
      userId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const decksStudiedToday = new Set(
      todaySessions.map((s) => s.deckId.toString())
    ).size;

    const allSessions = await StudySession.find({ userId });
    const totalCorrect = allSessions.reduce((a, s) => a + s.correct, 0);
    const totalAnswered = allSessions.reduce((a, s) => a + s.totalCards, 0);
    const accuracy = totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : null;

    res.json({
      decksStudiedToday,
      accuracy,
      totalSessions: allSessions.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar stats.' });
  }
};

// @desc    Flashcards favoritados do usuário
// @route   GET /api/study/favorites
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await Flashcard.find({
      userId: req.user.id,
      isFavorite: true,
    })
      .populate({ path: 'deckId', select: 'name emoji color', strictPopulate: false })
      .sort({ createdAt: -1 });

    res.json(favorites);
  } catch (error) {
    console.error('Erro getFavorites:', error);
    res.status(500).json({ message: 'Erro ao buscar favoritos.' });
  }
};

// @desc    Resetar histórico de sessões (parcial ou total)
// @route   DELETE /api/study/reset
exports.resetStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'all', period = 'all' } = req.body;

    // Monta filtro de período
    const filter = { userId };
    if (period !== 'all') {
      const since = new Date();
      if (period === 'today') {
        since.setHours(0, 0, 0, 0);
      } else {
        since.setDate(since.getDate() - parseInt(period));
        since.setHours(0, 0, 0, 0);
      }
      filter.createdAt = { $gte: since };
    }

    if (type === 'all') {
      // Apaga as sessões do período
      await StudySession.deleteMany(filter);
    } else if (type === 'accuracy') {
      // Zera acertos/erros mas mantém as sessões
      await StudySession.updateMany(filter, { $set: { correct: 0, wrong: 0 } });
    }

    res.json({ message: 'Estatísticas resetadas.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao resetar histórico.' });
  }
};

// @desc    Histórico de sessões de um deck específico
// @route   GET /api/study/deck/:deckId/history
exports.getDeckHistory = async (req, res) => {
  try {
    const sessions = await StudySession.find({
      userId: req.user.id,
      deckId: req.params.deckId,
    }).sort({ createdAt: -1 }).limit(20);

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar histórico do deck.' });
  }
};

// @route   GET /api/study/history?days=30
exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = Math.min(parseInt(req.query.days) || 14, 90);

    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const sessions = await StudySession.find({ userId, createdAt: { $gte: since } })
      .populate('deckId', 'name color');

    // Agrupa por dia
    const byDay = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay[key] = { date: key, cards: 0, correct: 0, sessions: 0 };
    }

    sessions.forEach((s) => {
      const key = s.createdAt.toISOString().slice(0, 10);
      if (byDay[key]) {
        byDay[key].cards    += s.totalCards;
        byDay[key].correct  += s.correct;
        byDay[key].sessions += 1;
      }
    });

    // Stats gerais
    const allSessions = await StudySession.find({ userId });
    const totalCards    = allSessions.reduce((a, s) => a + s.totalCards, 0);
    const totalCorrect  = allSessions.reduce((a, s) => a + s.correct, 0);
    const totalSessions = allSessions.length;
    const accuracy      = totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : null;

    // Streak de dias consecutivos estudados
    const studiedDays = new Set(allSessions.map((s) => s.createdAt.toISOString().slice(0, 10)));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (studiedDays.has(d.toISOString().slice(0, 10))) streak++;
      else break;
    }

    res.json({
      daily: Object.values(byDay),
      totalCards,
      totalCorrect,
      totalSessions,
      accuracy,
      streak,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar histórico.' });
  }
};

// PATCH getStats — versão enriquecida com dueTotal para badge da Navbar
// (sobrescreve o export existente via alias — o original fica como fallback)
const Flashcard_patch = require('../models/Flashcard');
const origGetStats = exports.getStats;
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay   = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const now = new Date();

    const [todaySessions, allSessions, dueTotal, cardsStudiedToday] = await Promise.all([
      require('../models/StudySession').find({ userId, createdAt: { $gte: startOfDay, $lte: endOfDay } }),
      require('../models/StudySession').find({ userId }),
      Flashcard_patch.countDocuments({ userId, nextReview: { $lte: now } }),
      require('../models/StudySession').aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId), createdAt: { $gte: startOfDay, $lte: endOfDay } } },
        { $group: { _id: null, total: { $sum: '$totalCards' } } },
      ]),
    ]);

    const decksStudiedToday = new Set(todaySessions.map((s) => s.deckId.toString())).size;
    const totalCorrect  = allSessions.reduce((a, s) => a + s.correct, 0);
    const totalAnswered = allSessions.reduce((a, s) => a + s.totalCards, 0);
    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

    res.json({
      decksStudiedToday,
      accuracy,
      totalSessions: allSessions.length,
      dueTotal,
      cardsStudiedToday: cardsStudiedToday[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar stats.' });
  }
};