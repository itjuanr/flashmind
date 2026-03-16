const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveSession, getStats, getFavorites, resetStats, getHistory, getDeckHistory } = require('../controllers/studyController');

router.use(protect);

router.post('/session', saveSession);
router.get('/stats', getStats);
router.get('/due-decks', async (req, res) => {
  try {
    const Flashcard = require('../models/Flashcard');
    const Deck      = require('../models/Deck');
    const mongoose  = require('mongoose');
    const now    = new Date();
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const dueCounts = await Flashcard.aggregate([
      { $match: { userId, nextReview: { $lte: now } } },
      { $group: { _id: '$deckId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    if (dueCounts.length === 0) return res.json([]);
    const deckIds = dueCounts.map((d) => d._id);
    const decks   = await Deck.find({ _id: { $in: deckIds } }).select('name emoji color').lean();
    const result  = dueCounts.map((d) => {
      const deck = decks.find((dk) => dk._id.toString() === d._id.toString());
      return deck ? { _id: d._id, name: deck.name, emoji: deck.emoji, color: deck.color, count: d.count } : null;
    }).filter(Boolean);
    res.json(result);
  } catch { res.status(500).json([]); }
});
router.get('/favorites', getFavorites);
router.get('/history', getHistory);
router.get('/deck/:deckId/history', getDeckHistory);
router.delete('/reset', resetStats);

module.exports = router;