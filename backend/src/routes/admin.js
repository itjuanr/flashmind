const express = require('express');
const router  = express.Router();
const { protect, adminOnly, staffOnly } = require('../middleware/authMiddleware');
const {
  getStats, listUsers, getUserDetail, getDeckDetail, setUserRole,
} = require('../controllers/adminController');

// Piso da área: sessão válida + cargo de equipe (admin ou TI).
// Aplicado no router inteiro, então uma rota nova criada aqui já nasce
// protegida em vez de depender de alguém lembrar de repetir o middleware.
router.use(protect, staffOnly);

// Leitura — admin e TI
router.get('/stats',          getStats);
router.get('/users',          listUsers);
router.get('/users/:id',      getUserDetail);
router.get('/decks/:id',      getDeckDetail);

// Escrita de privilégio — só admin. O adminOnly extra aqui é o que impede
// um TI de se autopromover usando o acesso de leitura que ele já tem.
router.patch('/users/:id/role', adminOnly, setUserRole);

module.exports = router;
