const express = require('express');
const router = express.Router();
const { generateFlashcards } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateFlashcards);

module.exports = router;