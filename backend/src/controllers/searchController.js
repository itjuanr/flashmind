const Deck = require('../models/Deck');
const Flashcard = require('../models/Flashcard');

// @desc    Busca global: decks + cards
// @route   GET /api/search?q=termo
exports.search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ decks: [], cards: [] });

    const regex = new RegExp(q, 'i');
    const userId = req.user.id;

    const [decks, cards] = await Promise.all([
      Deck.find({ userId, $or: [{ name: regex }, { description: regex }] }).limit(6),
      Flashcard.find({ userId, $or: [{ front: regex }, { back: regex }] })
        .populate('deckId', 'name emoji color')
        .limit(10),
    ]);

    res.json({ decks, cards });
  } catch (error) {
    res.status(500).json({ message: 'Erro na busca.' });
  }
};