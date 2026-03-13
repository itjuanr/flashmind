const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createDeck, getDecks, getDeck, updateDeck, deleteDeck,
  toggleFavoriteDeck, cloneDeck, toggleShare, getSharedDeck, cloneSharedDeck,
} = require('../controllers/deckController');

// Rotas públicas (sem auth)
router.get('/share/:token', getSharedDeck);
router.post('/share/:token/clone', cloneSharedDeck);

// Rotas protegidas
router.use(protect);
router.route('/').get(getDecks).post(createDeck);
router.patch('/:id/favorite', toggleFavoriteDeck);
router.patch('/:id/share', toggleShare);
router.post('/:id/clone', cloneDeck);
router.route('/:id').get(getDeck).put(updateDeck).delete(deleteDeck);

module.exports = router;