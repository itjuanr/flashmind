const Subject = require('../models/Subject');
const Note    = require('../models/Note');
const Deck    = require('../models/Deck');
const Flashcard = require('../models/Flashcard');
const mongoose = require('mongoose');
const crypto = require('crypto');

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
    
    const subject = await Subject.findOne({ _id: req.params.id, userId });
    if (!subject) return res.status(404).json({ message: 'Matéria não encontrada.' });

    // Exclusão reversível: as aulas ficam intactas. Antes eram apagadas em
    // massa junto com a matéria, sem nenhuma forma de recuperar.
    subject.deletedAt = new Date();
    await subject.save();
    res.json({ message: 'Matéria movida para a lixeira.' });
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

// ─── Compartilhamento de matéria ──────────────────────────────────────────────
// Espelha o fluxo de deck (toggleShare / getSharedDeck / cloneSharedDeck), mas
// leva junto todos os decks da matéria e os cards de cada um.

// @desc    Gerar/revogar link público da matéria
// @route   PATCH /api/notebook/subjects/:id/share
exports.toggleSubjectShare = async (req, res) => {
  try {
    const userId = req.user.id;
    const subject = await Subject.findOne({ _id: req.params.id, userId });
    if (!subject) return res.status(404).json({ message: 'Matéria não encontrada.' });

    if (subject.shareToken) {
      // undefined faz o Mongoose emitir $unset. Atribuir null gravaria o campo,
      // e o índice sparse unique indexa nulls — a segunda matéria revogada
      // colidiria com a primeira (E11000).
      subject.shareToken = undefined;
    } else {
      subject.shareToken = crypto.randomBytes(16).toString('hex');
    }
    await subject.save();

    res.json({ shareToken: subject.shareToken || null });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao compartilhar matéria.' });
  }
};

// @desc    Ver matéria pública por token (sem auth)
// @route   GET /api/notebook/subjects/share/:token
exports.getSharedSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({ shareToken: req.params.token }).lean();
    if (!subject) return res.status(404).json({ message: 'Link inválido ou expirado.' });

    const decks = await Deck.find({ subjectId: subject._id, userId: subject.userId })
      .sort({ createdAt: -1 })
      .lean();

    const counts = decks.length
      ? await Flashcard.aggregate([
          { $match: { deckId: { $in: decks.map((d) => d._id) } } },
          { $group: { _id: '$deckId', total: { $sum: 1 } } },
        ])
      : [];
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.total]));

    // Só o necessário para a prévia — sem áudio, que é pesado.
    const previewCards = decks.length
      ? await Flashcard.find({ deckId: { $in: decks.map((d) => d._id) } })
          .select('front back deckId')
          .limit(8)
          .lean()
      : [];

    res.json({
      subject: {
        name: subject.name,
        emoji: subject.emoji,
        color: subject.color,
        description: subject.description,
        semester: subject.semester,
      },
      decks: decks.map((d) => ({
        _id: d._id,
        name: d.name,
        emoji: d.emoji,
        color: d.color,
        description: d.description,
        tags: d.tags,
        flashcardCount: countMap.get(d._id.toString()) || 0,
      })),
      totalCards: counts.reduce((sum, c) => sum + c.total, 0),
      previewCards,
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao buscar matéria compartilhada.' });
  }
};

// @desc    Clonar matéria pública (com decks e cards) para a conta do usuário
// @route   POST /api/notebook/subjects/share/:token/clone
exports.cloneSharedSubject = async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjId = new mongoose.Types.ObjectId(userId);

    const original = await Subject.findOne({ shareToken: req.params.token }).lean();
    if (!original) return res.status(404).json({ message: 'Link inválido.' });

    const subjectClone = await Subject.create({
      userId,
      name: original.name,
      semester: original.semester,
      color: original.color,
      emoji: original.emoji,
      description: original.description,
      // shareToken fica de fora: o clone não herda o link público do original.
    });

    const decks = await Deck.find({ subjectId: original._id, userId: original.userId }).lean();

    let clonedDecks = 0;
    let clonedCards = 0;

    for (const deck of decks) {
      const deckClone = await Deck.create({
        userId,
        name: deck.name,
        description: deck.description,
        color: deck.color,
        emoji: deck.emoji,
        tags: deck.tags,
        deckImage: deck.deckImage,
        reviewSettings: deck.reviewSettings,
        subjectId: subjectClone._id, // aponta para a matéria nova, não a do dono original
      });
      clonedDecks++;

      const cards = await Flashcard.find({ deckId: deck._id }).lean();
      if (!cards.length) continue;

      const mapped = cards.map((c) => ({
        userId: userObjId,
        deckId: deckClone._id,
        front: c.front || '', back: c.back || '',
        frontImage: c.frontImage || null, backImage: c.backImage || null,
        frontAudio: c.frontAudio || null, backAudio: c.backAudio || null,
        notes: c.notes || '', cardColor: c.cardColor || null,
        position: c.position || 0,
      }));

      const BATCH = 50;
      for (let i = 0; i < mapped.length; i += BATCH) {
        await Flashcard.insertMany(mapped.slice(i, i + BATCH), { ordered: false });
      }
      clonedCards += mapped.length;
    }

    res.status(201).json({ subject: subjectClone.toObject(), clonedDecks, clonedCards });
  } catch (e) {
    console.error('cloneSharedSubject error:', e.message);
    res.status(500).json({ message: 'Erro ao clonar matéria compartilhada.' });
  }
};

// GET /api/notebook/subjects/trash
exports.getSubjectTrash = async (req, res) => {
  try {
    const materias = await Subject.find({ userId: req.user.id, deletedAt: { $ne: null } })
      .sort({ deletedAt: -1 }).lean();
    const ids = materias.map((m) => m._id);
    const notas = ids.length
      ? await Note.aggregate([{ $match: { subjectId: { $in: ids } } }, { $group: { _id: '$subjectId', total: { $sum: 1 } } }])
      : [];
    const mapa = new Map(notas.map((n) => [n._id.toString(), n.total]));
    res.json(materias.map((m) => ({ ...m, noteCount: mapa.get(m._id.toString()) || 0 })));
  } catch (e) { res.status(500).json({ message: 'Erro ao carregar a lixeira.' }); }
};

// POST /api/notebook/subjects/:id/restore
exports.restoreSubject = async (req, res) => {
  try {
    const s = await Subject.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: { $ne: null } });
    if (!s) return res.status(404).json({ message: 'Matéria não encontrada na lixeira.' });
    s.deletedAt = null;
    await s.save();
    res.json({ message: 'Matéria restaurada.' });
  } catch (e) { res.status(500).json({ message: 'Erro ao restaurar matéria.' }); }
};

// DELETE /api/notebook/subjects/:id/permanent
exports.purgeSubject = async (req, res) => {
  try {
    const s = await Subject.findOne({ _id: req.params.id, userId: req.user.id, deletedAt: { $ne: null } });
    if (!s) return res.status(404).json({ message: 'Matéria não encontrada na lixeira.' });
    await Note.deleteMany({ subjectId: s._id });
    // Decks apenas perdem o vinculo — sao entidades proprias e continuam valendo.
    await Deck.updateMany({ subjectId: s._id }, { $set: { subjectId: null } });
    await s.deleteOne();
    res.json({ message: 'Matéria excluída definitivamente.' });
  } catch (e) { res.status(500).json({ message: 'Erro ao excluir definitivamente.' }); }
};
