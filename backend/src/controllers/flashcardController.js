const Flashcard = require('../models/Flashcard');

exports.createFlashcard = async (req, res) => {
  try {
    const { deckId, front, back, frontImage, backImage, notes, frontAudio, backAudio, cardColor } = req.body;
    const frontOk = front?.trim() || frontImage || frontAudio;
    const backOk  = back?.trim()  || backImage  || backAudio;
    if (!frontOk || !backOk)
      return res.status(400).json({ message: 'Cada lado precisa ter texto, imagem ou áudio.' });
    const Deck = require('../models/Deck');
    const deck = await Deck.findById(deckId).select('reviewSettings');
    const delayDays = deck?.reviewSettings?.newCardDelay ?? 1;
    const count = await Flashcard.countDocuments({ deckId });
    const card = await Flashcard.create({
      userId: req.user.id, deckId,
      front: front?.trim() || '', back: back?.trim() || '',
      frontImage: frontImage || null, backImage: backImage || null,
      frontAudio: frontAudio || null, backAudio: backAudio || null,
      notes: notes || '', cardColor: cardColor || null,
      position: count,
      nextReview: new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000),
    });
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar card.', error: error.message });
  }
};

exports.getCardsByDeck = async (req, res) => {
  try {
    const cards = await Flashcard.find({ deckId: req.params.deckId, userId: req.user.id }).sort({ position: 1, createdAt: -1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar cards.' });
  }
};

exports.getCardsToStudy = async (req, res) => {
  try {
    const cards = await Flashcard.find({ deckId: req.params.deckId, userId: req.user.id, nextReview: { $lte: new Date() } });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar cards.' });
  }
};

exports.updateFlashcard = async (req, res) => {
  try {
    const card = await Flashcard.findById(req.params.id);
    if (!card || card.userId.toString() !== req.user.id)
      return res.status(404).json({ message: 'Card não encontrado.' });
    const { front, back, frontImage, backImage, notes, frontAudio, backAudio, cardColor } = req.body;
    if (front !== undefined) card.front = front.trim();
    if (back  !== undefined) card.back  = back.trim();
    if (frontImage !== undefined) card.frontImage = frontImage || null;
    if (backImage  !== undefined) card.backImage  = backImage  || null;
    if (frontAudio !== undefined) card.frontAudio = frontAudio || null;
    if (backAudio  !== undefined) card.backAudio  = backAudio  || null;
    if (notes      !== undefined) card.notes      = notes || '';
    if (cardColor  !== undefined) card.cardColor  = cardColor || null;
    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar card.' });
  }
};

// @desc    Reordenar cards (drag and drop)
// @route   PATCH /api/flashcards/reorder
exports.reorderCards = async (req, res) => {
  try {
    const { order } = req.body; // array de { _id, position }
    await Promise.all(order.map(({ _id, position }) =>
      Flashcard.updateOne({ _id, userId: req.user.id }, { position })
    ));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao reordenar.' });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const card = await Flashcard.findById(req.params.id);
    if (!card || card.userId.toString() !== req.user.id)
      return res.status(404).json({ message: 'Card não encontrado.' });
    card.isFavorite = !card.isFavorite;
    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao favoritar.' });
  }
};

exports.deleteFlashcard = async (req, res) => {
  try {
    const card = await Flashcard.findById(req.params.id);
    if (!card || card.userId.toString() !== req.user.id)
      return res.status(404).json({ message: 'Card não encontrado.' });
    await card.deleteOne();
    res.json({ message: 'Card removido.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir card.' });
  }
};

exports.reviewCard = async (req, res) => {
  try {
    const { difficulty, days: daysParam } = req.body;
    const card = await Flashcard.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card não encontrado.' });
    const days = daysParam || (difficulty === 'easy' ? 7 : difficulty === 'medium' ? 3 : 1);
    card.nextReview = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar revisão.' });
  }
};

exports.getFavoriteCards = async (req, res) => {
  try {
    const favorites = await Flashcard.find({ userId: req.user.id, isFavorite: true })
      .populate('deckId', 'name emoji color')
      .sort({ createdAt: -1 });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar favoritos.', detail: error.message });
  }
};