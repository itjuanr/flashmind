const Flashcard = require('../models/Flashcard');

// @desc    Criar flashcard
// @route   POST /api/flashcards
exports.createFlashcard = async (req, res) => {
  try {
    const { deckId, front, back, frontImage, backImage, notes, frontAudio, backAudio } = req.body;

    console.log('[createFlashcard] recebido:', {
      front: front?.substring(0, 30),
      frontAudio: frontAudio ? `presente (${(frontAudio.length/1024).toFixed(1)}KB)` : null,
      backAudio:  backAudio  ? `presente (${(backAudio.length/1024).toFixed(1)}KB)`  : null,
    });

    // Frente e verso precisam de texto OU imagem OU áudio
    const frontOk = front?.trim() || frontImage || frontAudio;
    const backOk  = back?.trim()  || backImage  || backAudio;
    if (!frontOk || !backOk) {
      return res.status(400).json({ message: 'Cada lado precisa ter texto, imagem ou áudio.' });
    }

    const Deck = require('../models/Deck');
    const deck = await Deck.findById(deckId).select('reviewSettings');
    const delayDays = deck?.reviewSettings?.newCardDelay ?? 1;
    const nextReview = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000);

    const card = await Flashcard.create({
      userId: req.user.id,
      deckId,
      front: front.trim(),
      back: back.trim(),
      frontImage: frontImage || null,
      backImage:  backImage  || null,
      frontAudio: frontAudio || null,
      backAudio:  backAudio  || null,
      notes: notes || '',
      nextReview,
    });

    console.log('[createFlashcard] salvo:', {
      _id: card._id,
      frontAudio: card.frontAudio ? `presente (${(card.frontAudio.length/1024).toFixed(1)}KB)` : null,
      backAudio:  card.backAudio  ? `presente (${(card.backAudio.length/1024).toFixed(1)}KB)`  : null,
    });

    res.status(201).json(card);
  } catch (error) {
    console.error('[createFlashcard] erro:', error.message);
    res.status(500).json({ message: 'Erro ao criar card.', error: error.message });
  }
};

// @desc    Listar flashcards de um deck
// @route   GET /api/flashcards/deck/:deckId
exports.getCardsByDeck = async (req, res) => {
  try {
    const cards = await Flashcard.find({
      deckId: req.params.deckId,
      userId: req.user.id,
    }).sort({ createdAt: -1 });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar cards.' });
  }
};

// @desc    Buscar cards para estudo (repetição espaçada)
// @route   GET /api/flashcards/deck/:deckId/study
exports.getCardsToStudy = async (req, res) => {
  try {
    const cards = await Flashcard.find({
      deckId: req.params.deckId,
      userId: req.user.id,
      nextReview: { $lte: new Date() },
    });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar cards.' });
  }
};

// @desc    Editar flashcard
// @route   PUT /api/flashcards/:id
exports.updateFlashcard = async (req, res) => {
  try {
    const card = await Flashcard.findById(req.params.id);
    if (!card || card.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Card não encontrado.' });
    }
    const { front, back, frontImage, backImage, notes, frontAudio, backAudio } = req.body;

    console.log('[updateFlashcard] recebido:', {
      id: req.params.id,
      frontAudio: frontAudio !== undefined ? (frontAudio ? `presente (${(frontAudio.length/1024).toFixed(1)}KB)` : 'null') : 'não enviado',
      backAudio:  backAudio  !== undefined ? (backAudio  ? `presente (${(backAudio.length/1024).toFixed(1)}KB)`  : 'null') : 'não enviado',
    });

    if (front) card.front = front.trim();
    if (back)  card.back  = back.trim();
    if (frontImage !== undefined) card.frontImage = frontImage || null;
    if (backImage  !== undefined) card.backImage  = backImage  || null;
    if (frontAudio !== undefined) card.frontAudio = frontAudio || null;
    if (backAudio  !== undefined) card.backAudio  = backAudio  || null;
    if (notes !== undefined) card.notes = notes || '';
    await card.save();

    console.log('[updateFlashcard] salvo:', {
      frontAudio: card.frontAudio ? `presente (${(card.frontAudio.length/1024).toFixed(1)}KB)` : null,
      backAudio:  card.backAudio  ? `presente (${(card.backAudio.length/1024).toFixed(1)}KB)`  : null,
    });

    res.json(card);
  } catch (error) {
    console.error('[updateFlashcard] erro:', error.message);
    res.status(500).json({ message: 'Erro ao atualizar card.' });
  }
};

// @desc    Toggle favorito
// @route   PATCH /api/flashcards/:id/favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const card = await Flashcard.findById(req.params.id);
    if (!card || card.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Card não encontrado.' });
    }
    card.isFavorite = !card.isFavorite;
    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao favoritar.' });
  }
};

// @desc    Deletar flashcard
// @route   DELETE /api/flashcards/:id
exports.deleteFlashcard = async (req, res) => {
  try {
    const card = await Flashcard.findById(req.params.id);
    if (!card || card.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Card não encontrado.' });
    }
    await card.deleteOne();
    res.json({ message: 'Card removido.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir card.' });
  }
};

// @desc    Atualizar após revisão (repetição espaçada)
// @route   PUT /api/flashcards/:id/review
exports.reviewCard = async (req, res) => {
  try {
    const { difficulty, days: daysParam } = req.body;
    const card = await Flashcard.findById(req.params.id);
    if (!card) return res.status(404).json({ message: 'Card não encontrado.' });

    let days = daysParam;
    if (!days) {
      days = difficulty === 'easy' ? 7 : difficulty === 'medium' ? 3 : 1;
    }

    card.nextReview = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar revisão.' });
  }
};

// @desc    Listar flashcards favoritados do usuário
// @route   GET /api/flashcards/favorites
exports.getFavoriteCards = async (req, res) => {
  try {
    const favorites = await Flashcard.find({
      userId: req.user.id,
      isFavorite: true,
    })
      .populate('deckId', 'name emoji color')
      .sort({ createdAt: -1 });
    res.json(favorites);
  } catch (error) {
    console.error('[getFavoriteCards] erro:', error.message);
    res.status(500).json({ message: 'Erro ao buscar favoritos.', detail: error.message });
  }
};