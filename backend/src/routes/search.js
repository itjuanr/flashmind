const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { search } = require('../controllers/searchController');

router.get('/', protect, search);

module.exports = router;