const Subject = require('../models/Subject');
const Note    = require('../models/Note');
const mongoose = require('mongoose');

// GET /api/notebook/subjects
exports.getSubjects = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userIdObj = new mongoose.Types.ObjectId(String(userId));

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

// POST /api/notebook/subjects
exports.createSubject = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
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
    const userId = req.user?.id || req.user?._id;
    
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
    const userId = req.user?.id || req.user?._id;
    
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, userId });
    if (!subject) return res.status(404).json({ message: 'Matéria não encontrada.' });
    
    // Apaga todas as notas da matéria
    await Note.deleteMany({ subjectId: req.params.id });
    res.json({ message: 'Matéria e aulas removidas.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};