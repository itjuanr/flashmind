const Note    = require('../models/Note');
const Subject = require('../models/Subject');

// GET /api/notebook/subjects/:subjectId/notes
exports.getNotes = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, userId: req.user.id });
    if (!subject) return res.status(404).json({ message: 'Matéria não encontrada.' });
    const notes = await Note.find({ subjectId: req.params.subjectId, userId: req.user.id })
      .select('-content') // não retorna o conteúdo na listagem (pode ser grande)
      .sort({ date: -1 });
    res.json(notes);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/notebook/notes/:id
exports.getNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ message: 'Aula não encontrada.' });
    res.json(note);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/notebook/subjects/:subjectId/notes
exports.createNote = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, userId: req.user.id });
    if (!subject) return res.status(404).json({ message: 'Matéria não encontrada.' });
    const { title, content, date, attachments } = req.body;
    const note = await Note.create({
      userId: req.user.id,
      subjectId: req.params.subjectId,
      title: title || 'Nova aula',
      content: content || '',
      date: date || new Date(),
      attachments: attachments || [],
    });
    res.status(201).json(note);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

// PUT /api/notebook/notes/:id
exports.updateNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!note) return res.status(404).json({ message: 'Aula não encontrada.' });
    res.json(note);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

// DELETE /api/notebook/notes/:id
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ message: 'Aula não encontrada.' });
    res.json({ message: 'Aula removida.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// POST /api/notebook/notes/:id/attachments
exports.addAttachment = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ message: 'Aula não encontrada.' });
    const { type, name, data, url } = req.body;
    note.attachments.push({ type, name, data, url });
    await note.save();
    res.json(note.attachments[note.attachments.length - 1]);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

// DELETE /api/notebook/notes/:id/attachments/:attachId
exports.deleteAttachment = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user.id });
    if (!note) return res.status(404).json({ message: 'Aula não encontrada.' });
    note.attachments = note.attachments.filter(a => a._id.toString() !== req.params.attachId);
    await note.save();
    res.json({ message: 'Anexo removido.' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// GET /api/notebook/search?q=
exports.searchNotes = async (req, res) => {
  try {
    const q = req.query.q || '';
    if (q.length < 2) return res.json([]);
    const notes = await Note.find({
      userId: req.user.id,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
      ],
    })
      .select('title date subjectId')
      .populate('subjectId', 'name emoji color')
      .sort({ updatedAt: -1 })
      .limit(20);
    res.json(notes);
  } catch (e) { res.status(500).json({ message: e.message }); }
};