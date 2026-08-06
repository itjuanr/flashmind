const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getRanking } = require('../controllers/rankingController');

router.use(protect);
router.get('/', getRanking);

module.exports = router;
