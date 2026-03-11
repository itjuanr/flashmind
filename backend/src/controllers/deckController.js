const Deck = require('../models/Deck');
const Flashcard = require('../models/Flashcard');

// @desc    Criar novo deck
// @route   POST /api/decks
exports.createDeck = async (req, res) => {
  try {
    const { name, description, color, emoji, deckImage, tags, reviewSettings } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'O nome do deck é obrigatório.' });
    }

    const deck = await Deck.create({
      userId: req.user.id,
      name: name.trim(),
      description,
      color,
      emoji,
      deckImage: deckImage || null,
      tags: Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()).filter(Boolean) : [],
      reviewSettings: reviewSettings || { notify: true, newCardDelay: 1 },
    });

    res.status(201).json({ ...deck.toObject(), flashcardCount: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar deck.', error: error.message });
  }
};

// @desc    Toggle favorito do deck
// @route   PATCH /api/decks/:id/favorite
exports.toggleFavoriteDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck || deck.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck não encontrado.' });
    }
    deck.isFavorite = !deck.isFavorite;
    await deck.save();
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao favoritar deck.' });
  }
};

// @desc    Clonar deck (duplicar)
// @route   POST /api/decks/:id/clone
exports.cloneDeck = async (req, res) => {
  try {
    const original = await Deck.findById(req.params.id);
    if (!original || original.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck não encontrado.' });
    }

    const clone = await Deck.create({
      userId: req.user.id,
      name: `${original.name} (cópia)`,
      description: original.description,
      color: original.color,
      emoji: original.emoji,
      deckImage: original.deckImage,
      tags: original.tags,
    });

    // Clonar todos os flashcards
    const cards = await Flashcard.find({ deckId: original._id });
    const clonedCards = cards.map((c) => ({
      userId: req.user.id,
      deckId: clone._id,
      front: c.front,
      back: c.back,
      frontImage: c.frontImage,
      backImage: c.backImage,
    }));
    if (clonedCards.length > 0) await Flashcard.insertMany(clonedCards);

    res.status(201).json({ ...clone.toObject(), flashcardCount: clonedCards.length });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao clonar deck.', error: error.message });
  }
};

// @desc    Buscar um deck por ID
// @route   GET /api/decks/:id
exports.getDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck || deck.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck não encontrado.' });
    }
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar deck.' });
  }
};

// @desc    Listar decks do usuário com contagem de flashcards e progresso
// @route   GET /api/decks
exports.getDecks = async (req, res) => {
  try {
    const decks = await Deck.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const now = new Date();
    const decksWithCount = await Promise.all(
      decks.map(async (deck) => {
        const [count, masteredCount, dueCount] = await Promise.all([
          Flashcard.countDocuments({ deckId: deck._id }),
          Flashcard.countDocuments({ deckId: deck._id, nextReview: { $gt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } }),
          Flashcard.countDocuments({ deckId: deck._id, nextReview: { $lte: now } }),
        ]);
        return { ...deck.toObject(), flashcardCount: count, masteredCount, dueCount };
      })
    );

    res.json(decksWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar decks.' });
  }
};

// @desc    Atualizar deck
// @route   PUT /api/decks/:id
exports.updateDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);

    if (!deck || deck.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck não encontrado.' });
    }

    const { name, description, color, emoji, deckImage, tags, reviewSettings } = req.body;
    if (name) deck.name = name.trim();
    if (description !== undefined) deck.description = description;
    if (color) deck.color = color;
    if (emoji) deck.emoji = emoji;
    if (deckImage !== undefined) deck.deckImage = deckImage || null;
    if (tags !== undefined) deck.tags = Array.isArray(tags) ? tags.map(t => t.trim().toLowerCase()).filter(Boolean) : [];
    if (reviewSettings !== undefined) {
      deck.reviewSettings = {
        notify:       reviewSettings.notify       ?? true,
        newCardDelay: reviewSettings.newCardDelay ?? 1,
      };
    }

    await deck.save();
    res.json(deck.toObject());
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar deck.', error: error.message });
  }
};

// @desc    Deletar deck e seus flashcards
// @route   DELETE /api/decks/:id
exports.deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);

    if (!deck || deck.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck não encontrado.' });
    }

    await Flashcard.deleteMany({ deckId: deck._id });
    await deck.deleteOne();

    res.json({ message: 'Deck e flashcards removidos com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir deck.', error: error.message });
  }
};

// @desc    Toggle favorito do deck
// @route   PATCH /api/decks/:id/favorite
exports.toggleFavoriteDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck || deck.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck não encontrado.' });
    }
    deck.isFavorite = !deck.isFavorite;
    await deck.save();
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao favoritar deck.' });
  }
};

// @desc    Buscar um deck por ID
// @route   GET /api/decks/:id
exports.getDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck || deck.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck não encontrado.' });
    }
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar deck.' });
  }
};

// @desc    Listar decks do usuário com contagem de flashcards e progresso
// @route   GET /api/decks
exports.getDecks = async (req, res) => {
  try {
    const decks = await Deck.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const now = new Date();
    const decksWithCount = await Promise.all(
      decks.map(async (deck) => {
        const [count, masteredCount, dueCount] = await Promise.all([
          Flashcard.countDocuments({ deckId: deck._id }),
          // "dominados": cards que só precisam ser revisados daqui a mais de 7 dias (level alto)
          Flashcard.countDocuments({ deckId: deck._id, nextReview: { $gt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } }),
          // "para revisar hoje": nextReview <= agora
          Flashcard.countDocuments({ deckId: deck._id, nextReview: { $lte: now } }),
        ]);
        return { ...deck.toObject(), flashcardCount: count, masteredCount, dueCount };
      })
    );

    res.json(decksWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar decks.' });
  }
};

// @desc    Deletar deck e seus flashcards
// @route   DELETE /api/decks/:id
exports.deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);

    if (!deck || deck.userId.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Deck não encontrado.' });
    }

    await Flashcard.deleteMany({ deckId: deck._id });
    await deck.deleteOne();

    res.json({ message: 'Deck e flashcards removidos com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir deck.', error: error.message });
  }
};