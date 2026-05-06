const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSubjects, createSubject, updateSubject, deleteSubject,
} = require('../controllers/subjectController');
const {
  getNotes, getNote, createNote, updateNote, deleteNote,
  addAttachment, deleteAttachment, searchNotes,
} = require('../controllers/noteController');

router.use(protect);

// Matérias
router.get('/subjects',          getSubjects);
router.post('/subjects',         createSubject);
router.put('/subjects/:id',      updateSubject);
router.delete('/subjects/:id',   deleteSubject);

// Aulas por matéria
router.get('/subjects/:subjectId/notes',  getNotes);
router.post('/subjects/:subjectId/notes', createNote);

// Aulas individuais
router.get('/notes/:id',     getNote);
router.put('/notes/:id',     updateNote);
router.delete('/notes/:id',  deleteNote);

// Anexos
router.post('/notes/:id/attachments',                  addAttachment);
router.delete('/notes/:id/attachments/:attachId',      deleteAttachment);

// Busca
router.get('/search', searchNotes);

module.exports = router;