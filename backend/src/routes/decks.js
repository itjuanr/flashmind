const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createDeck, getDecks, getDeck, updateDeck, deleteDeck,
  toggleFavoriteDeck, cloneDeck, toggleShare, getSharedDeck, cloneSharedDeck,
  getTrash, restoreDeck, purgeDeck,
} = require('../controllers/deckController');

// Rotas públicas (sem auth)
router.get('/share/:token', getSharedDeck);

// Rotas protegidas
router.use(protect);
router.route('/').get(getDecks).post(createDeck);
// Lixeira — '/trash' precisa vir antes de '/:id', senao "trash" seria lido
// como um id de deck.
router.get('/trash', getTrash);
router.post('/:id/restore', restoreDeck);
router.delete('/:id/permanent', purgeDeck);
router.patch('/:id/favorite', toggleFavoriteDeck);
router.patch('/:id/share', toggleShare);
router.post('/share/:token/clone', cloneSharedDeck);
router.post('/:id/clone', cloneDeck);
router.route('/:id').get(getDeck).put(updateDeck).delete(deleteDeck);

module.exports = router;