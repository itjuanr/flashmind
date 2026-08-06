const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  type:  { type: String, enum: ['image', 'pdf', 'video', 'link'], required: true },
  name:  { type: String, default: '' },
  data:  { type: String, default: null }, // base64 para image/pdf
  url:   { type: String, default: null }, // URL para video/link
}, { _id: true });

const noteSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title:     { type: String, required: [true, 'Adicione um título para a aula'], default: 'Nova aula' },
  content:   { type: String, default: '' }, // HTML do TipTap
  date:      { type: Date, default: Date.now },
  attachments: [attachmentSchema],
}, { timestamps: true });

// Índice para busca por texto
noteSchema.index({ title: 'text', content: 'text' });

// Listagem de aulas de uma matéria (getNotes filtra por subjectId + userId).
noteSchema.index({ userId: 1, subjectId: 1, date: -1 });

module.exports = mongoose.model('Note', noteSchema);