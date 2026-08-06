const Subject = require('../models/Subject');
const Note    = require('../models/Note');
const Deck    = require('../models/Deck');
const Flashcard = require('../models/Flashcard');
const mongoose = require('mongoose');

// GET /api/notebook/subjects
exports.getSubjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Usar aggregation com $lookup para buscar matérias e contar suas notas em uma única query
    const subjectsWithCount = await Subject.aggregate([
      { $match: { userId: userIdObj } },
      { $sort: { semester: 1, name: 1 } },
      {
        $lookup: {
          from: 'notes', // a coleção de 'Note'
          localField: '_id',
          foreignField: 'subjectId',
          as: 'notes'
        }
      },
      {
        $addFields: {
          noteCount: { $size: '$notes' }
        }
      },
      { $project: { notes: 0 } } // Remove o array de notas para não poluir a resposta
    ]);

    res.json(subjectsWithCount);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/notebook/subjects/:id
exports.getSubjectById = async (req, res) => {
  try {
    const userId = req.user.id;
    const subject = await Subject.findOne({ _id: req.params.id, userId }).lean();
    if (!subject) {
      return res.status(404).json({ message: 'Matéria não encontrada.' });
    }
    res.json(subject);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/notebook/subjects
exports.createSubject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, semester, color, emoji, description } = req.body;
    
    const subject = await Subject.create({ 
      userId, 
      name, 
      semester, 
      color, 
      emoji, 
      description 
    });
    
    res.status(201).json(subject);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

// PUT /api/notebook/subjects/:id
exports.updateSubject = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!subject) return res.status(404).json({ message: 'Matéria não encontrada.' });
    res.json(subject);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

// DELETE /api/notebook/subjects/:id
exports.deleteSubject = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, userId });
    if (!subject) return res.status(404).json({ message: 'Matéria não encontrada.' });
    
    // Apaga todas as notas da matéria
    await Note.deleteMany({ subjectId: req.params.id });
    res.json({ message: 'Matéria e aulas removidas.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// @desc    Listar decks de uma matéria
// @route   GET /api/notebook/subjects/:subjectId/decks
exports.getDecksBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const userId = req.user.id;

    const filter = { userId };
    if (subjectId === 'unassigned') {
      filter.subjectId = { $in: [null, undefined] };
    } else {
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({ message: 'ID de matéria inválido.' });
      }
      filter.subjectId = subjectId;
    }

    const decks = await Deck.find(filter).sort({ createdAt: -1 }).lean();
    
    if (decks.length === 0) {
      return res.json([]);
    }

    const deckIds = decks.map(d => d._id);
    const now = new Date();

    const cardCounts = await Flashcard.aggregate([
      { $match: { deckId: { $in: deckIds } } },
      {
        $group: {
          _id: '$deckId',
          flashcardCount: { $sum: 1 },
          dueCount: { $sum: { $cond: [{ $lte: ['$nextReview', now] }, 1, 0] } },
          masteredCount: { $sum: { $cond: [{ $gte: ['$level', 5] }, 1, 0] } }
        }
      }
    ]);

    const countsMap = new Map(cardCounts.map(c => [c._id.toString(), c]));

    const decksWithCounts = decks.map(deck => ({
      ...deck,
      flashcardCount: countsMap.get(deck._id.toString())?.flashcardCount || 0,
      dueCount: countsMap.get(deck._id.toString())?.dueCount || 0,
      masteredCount: countsMap.get(deck._id.toString())?.masteredCount || 0,
    }));

    res.json(decksWithCounts);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar decks da matéria.' });
  }
};