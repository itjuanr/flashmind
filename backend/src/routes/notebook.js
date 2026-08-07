const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getSubjects, createSubject, updateSubject, deleteSubject, getSubjectById,
  getDecksBySubject, toggleSubjectShare, getSharedSubject, cloneSharedSubject,
  getSubjectTrash, restoreSubject, purgeSubject,
} = require('../controllers/subjectController');
const {
  getNotes, getNote, createNote, updateNote, deleteNote,
  addAttachment, deleteAttachment, searchNotes,
} = require('../controllers/noteController');

// ── Pública: visualizar matéria compartilhada (sem login) ──
// Precisa vir antes do protect. Também antes de '/subjects/:id' para que
// "share" não seja lido como um id.
router.get('/subjects/share/:token', getSharedSubject);

router.use(protect);

// Clonar matéria compartilhada — exige login, por isso fica depois do protect
router.post('/subjects/share/:token/clone', cloneSharedSubject);

// Matérias
router.get('/subjects',          getSubjects);
// Antes de '/subjects/:id', senao "trash" seria lido como um id.
router.get('/subjects/trash',    getSubjectTrash);
router.post('/subjects/:id/restore',    restoreSubject);
router.delete('/subjects/:id/permanent', purgeSubject);
router.post('/subjects',         createSubject);
router.get('/subjects/:id',      getSubjectById);
router.put('/subjects/:id',      updateSubject);
router.delete('/subjects/:id',   deleteSubject);
router.patch('/subjects/:id/share', toggleSubjectShare);

// Aulas por matéria
router.get('/subjects/:subjectId/decks',  getDecksBySubject);
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