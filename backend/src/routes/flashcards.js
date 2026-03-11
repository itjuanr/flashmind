const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createFlashcard,
  getCardsByDeck,
  getCardsToStudy,
  updateFlashcard,
  toggleFavorite,
  deleteFlashcard,
  reviewCard,
} = require('../controllers/flashcardController');

router.use(protect);

router.post('/', createFlashcard);
router.get('/deck/:deckId', getCardsByDeck);
router.get('/deck/:deckId/study', getCardsToStudy);
router.put('/:id', updateFlashcard);
router.patch('/:id/favorite', toggleFavorite);
router.delete('/:id', deleteFlashcard);
router.put('/:id/review', reviewCard);

module.exports = router;
