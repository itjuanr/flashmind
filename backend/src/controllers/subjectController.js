const Subject = require('../models/Subject');
const Note    = require('../models/Note');

// GET /api/notebook/subjects
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ userId: req.user.id }).sort({ semester: 1, name: 1 });
    // Conta notas por matéria
    const counts = await Note.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$subjectId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });
    const result = subjects.map(s => ({
      ...s.toObject(),
      noteCount: countMap[s._id.toString()] || 0,
    }));
    res.json(result);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/notebook/subjects
exports.createSubject = async (req, res) => {
  try {
    const { name, semester, color, emoji, description } = req.body;
    const subject = await Subject.create({ userId: req.user.id, name, semester, color, emoji, description });
    res.status(201).json(subject);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

// PUT /api/notebook/subjects/:id
exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
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
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!subject) return res.status(404).json({ message: 'Matéria não encontrada.' });
    // Apaga todas as notas da matéria
    await Note.deleteMany({ subjectId: req.params.id });
    res.json({ message: 'Matéria e aulas removidas.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};