const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createDeck, getDecks, getDeck, updateDeck, deleteDeck, toggleFavoriteDeck, cloneDeck,
} = require('../controllers/deckController');

router.use(protect);

router.route('/').get(getDecks).post(createDeck);
router.patch('/:id/favorite', toggleFavoriteDeck);
router.post('/:id/clone', cloneDeck);
router.route('/:id').get(getDeck).put(updateDeck).delete(deleteDeck);

module.exports = router;