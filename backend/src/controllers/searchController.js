const Deck = require('../models/Deck');
const Flashcard = require('../models/Flashcard');
const Note = require('../models/Note');

// @desc    Busca global: decks + cards
// @route   GET /api/search?q=termo
exports.search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json({ decks: [], cards: [], notes: [] });

    const regex = new RegExp(q, 'i');
    const userId = req.user.id;

    const [decks, cards, notes] = await Promise.all([
      Deck.find({ userId, $or: [{ name: regex }, { description: regex }] }).limit(6).lean(),
      Flashcard.find({ userId, $text: { $search: q } }) // Aplicando busca com índice de texto ultra-rápido!
        .populate('deckId', 'name emoji color')
        .limit(10)
        .lean(),
      Note.find({ userId, $or: [{ title: regex }, { content: regex }] })
        .select('title date subjectId')
        .populate('subjectId', 'name emoji color')
        .limit(5)
        .lean(),
    ]);

    res.json({ decks, cards, notes });
  } catch (error) {
    res.status(500).json({ message: 'Erro na busca.' });
  }
};