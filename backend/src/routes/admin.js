const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getStats, listUsers, getUserDetail, getDeckDetail,
} = require('../controllers/adminController');

// Toda a área exige sessão válida E papel de admin, nesta ordem.
// Aplicado no router inteiro: uma rota nova criada aqui já nasce protegida,
// em vez de depender de alguém lembrar de repetir o middleware.
router.use(protect, adminOnly);

router.get('/stats',          getStats);
router.get('/users',          listUsers);
router.get('/users/:id',      getUserDetail);
router.get('/decks/:id',      getDeckDetail);

module.exports = router;
