const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveSession, getStats, getFavorites, resetStats, getHistory, getDeckHistory } = require('../controllers/studyController');

router.use(protect);

router.post('/session', saveSession);
router.get('/stats', getStats);
router.get('/favorites', getFavorites);
router.get('/history', getHistory);
router.get('/deck/:deckId/history', getDeckHistory);
router.delete('/reset', resetStats);

module.exports = router;