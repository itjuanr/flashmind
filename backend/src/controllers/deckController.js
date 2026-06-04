const crypto = require('crypto');
const Deck = require('../models/Deck');
const Flashcard = require('../models/Flashcard');

// @desc    Criar novo deck
// @route   POST /api/decks
exports.createDeck = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { name, description, color, emoji, deckImage, tags, reviewSettings } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'O nome do deck é obrigatório.' });
    const deck = await Deck.create({
      userId,
      name: name.trim(), description, color, emoji,
      deckImage: deckImage || null,
      tags: Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      reviewSettings: reviewSettings || { notify: true, newCardDelay: 1 },
    });
    res.status(201).json({ ...deck.toObject(), flashcardCount: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar deck.', error: error.message });
  }
};

// @desc    Listar decks com contagem e dueCount
// @route   GET /api/decks
exports.getDecks = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Busca os decks e, em paralelo, agrega as contagens dos flashcards
    const [decks, counts] = await Promise.all([
      Deck.find({ userId }).sort({ createdAt: -1 }).lean(),
      Flashcard.aggregate([
        { $match: { userId: require('mongoose').Types.ObjectId(String(userId)) } },
        {
          $group: {
            _id: '$deckId',
            flashcardCount: { $sum: 1 },
            dueCount: { $sum: { $cond: [{ $lte: ['$nextReview', now] }, 1, 0] } },
            masteredCount: { $sum: { $cond: [{ $gt: ['$nextReview', sevenDaysFromNow] }, 1, 0] } }
          }
        }
      ])
    ]);

    const countsMap = new Map(counts.map(c => [c._id.toString(), c]));
    const result = decks.map(deck => ({ ...deck, ...(countsMap.get(deck._id.toString()) || { flashcardCount: 0, dueCount: 0, masteredCount: 0 }) }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar decks.' });
  }
};

// @desc    Buscar deck por ID
// @route   GET /api/decks/:id
exports.getDeck = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const deck = await Deck.findById(req.params.id).lean();
    if (!deck || deck.userId.toString() !== String(userId))
      return res.status(404).json({ message: 'Deck não encontrado.' });
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar deck.' });
  }
};

// @desc    Atualizar deck
// @route   PUT /api/decks/:id
exports.updateDeck = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const deck = await Deck.findById(req.params.id);
    if (!deck || deck.userId.toString() !== String(userId))
      return res.status(404).json({ message: 'Deck não encontrado.' });
    const { name, description, color, emoji, deckImage, tags, reviewSettings } = req.body;
    if (name) deck.name = name.trim();
    if (description !== undefined) deck.description = description;
    if (color) deck.color = color;
    if (emoji) deck.emoji = emoji;
    if (deckImage !== undefined) deck.deckImage = deckImage || null;
    if (tags !== undefined) deck.tags = Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()).filter(Boolean) : [];
    if (reviewSettings !== undefined) deck.reviewSettings = { notify: reviewSettings.notify ?? true, newCardDelay: reviewSettings.newCardDelay ?? 1 };
    await deck.save();
    res.json(deck.toObject());
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar deck.', error: error.message });
  }
};

// @desc    Deletar deck
// @route   DELETE /api/decks/:id
exports.deleteDeck = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const deck = await Deck.findById(req.params.id);
    if (!deck || deck.userId.toString() !== String(userId))
      return res.status(404).json({ message: 'Deck não encontrado.' });
    await Flashcard.deleteMany({ deckId: deck._id });
    await deck.deleteOne();
    res.json({ message: 'Deck removido.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir deck.' });
  }
};

// @desc    Toggle favorito
// @route   PATCH /api/decks/:id/favorite
exports.toggleFavoriteDeck = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const deck = await Deck.findById(req.params.id);
    if (!deck || deck.userId.toString() !== String(userId))
      return res.status(404).json({ message: 'Deck não encontrado.' });
    deck.isFavorite = !deck.isFavorite;
    await deck.save();
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao favoritar.' });
  }
};

// @desc    Clonar deck
// @route   POST /api/decks/:id/clone
exports.cloneDeck = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const mongoose = require('mongoose');
    const original = await Deck.findById(req.params.id);
    if (!original || original.userId.toString() !== String(userId))
      return res.status(404).json({ message: 'Deck não encontrado.' });
    const clone = await Deck.create({
      userId,
      name: `${original.name} (cópia)`,
      description: original.description,
      color: original.color, emoji: original.emoji,
      deckImage: original.deckImage, tags: original.tags,
    });
    const cards = await Flashcard.find({ deckId: original._id }).lean();
    if (cards.length > 0) {
      const userObjId = new mongoose.Types.ObjectId(String(userId));
      const mapped = cards.map((c) => ({
        userId: userObjId,
        deckId: clone._id,
        front: c.front || '', back: c.back || '',
        frontImage: c.frontImage || null, backImage: c.backImage || null,
        frontAudio: c.frontAudio || null, backAudio: c.backAudio || null,
        notes: c.notes || '', cardColor: c.cardColor || null,
        position: c.position || 0,
      }));
      const BATCH = 50;
      for (let i = 0; i < mapped.length; i += BATCH) {
        await Flashcard.insertMany(mapped.slice(i, i + BATCH), { ordered: false });
      }
    }
    res.status(201).json({ ...clone.toObject(), flashcardCount: cards.length });
  } catch (error) {
    console.error('cloneDeck error:', error.message);
    res.status(500).json({ message: 'Erro ao clonar deck.', error: error.message });
  }
};

// @desc    Gerar/revogar link público
// @route   PATCH /api/decks/:id/share
exports.toggleShare = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const deck = await Deck.findById(req.params.id);
    if (!deck || deck.userId.toString() !== String(userId))
      return res.status(404).json({ message: 'Deck não encontrado.' });
    if (deck.shareToken) {
      deck.shareToken = null; // revogar
    } else {
      deck.shareToken = crypto.randomBytes(16).toString('hex');
    }
    await deck.save();
    res.json({ shareToken: deck.shareToken });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao compartilhar.' });
  }
};

// @desc    Ver deck público por token (sem auth)
// @route   GET /api/decks/share/:token
exports.getSharedDeck = async (req, res) => {
  try {
    const deck = await Deck.findOne({ shareToken: req.params.token }).lean();
    if (!deck) return res.status(404).json({ message: 'Link inválido ou expirado.' });
    const cards = await Flashcard.find({ deckId: deck._id }).select('-frontAudio -backAudio').lean();
    res.json({ deck: { name: deck.name, description: deck.description, emoji: deck.emoji, color: deck.color, tags: deck.tags }, cards });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar deck.' });
  }
};

// @desc    Clonar deck público para a conta do usuário logado
// @route   POST /api/decks/share/:token/clone
exports.cloneSharedDeck = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const original = await Deck.findOne({ shareToken: req.params.token });
    if (!original) return res.status(404).json({ message: 'Link inválido.' });
    const clone = await Deck.create({
      userId,
      name: original.name, description: original.description,
      color: original.color, emoji: original.emoji, tags: original.tags,
    });
    const cards = await Flashcard.find({ deckId: original._id });
    if (cards.length > 0) await Flashcard.insertMany(cards.map((c) => ({
      userId, deckId: clone._id,
      front: c.front, back: c.back,
      frontImage: c.frontImage, backImage: c.backImage, notes: c.notes,
    })));
    res.status(201).json({ ...clone.toObject(), flashcardCount: cards.length });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao clonar deck compartilhado.' });
  }
};