const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:     { type: String, required: [true, 'Adicione um nome para a matéria'] },
  semester: { type: String, default: '' },
  color:    { type: String, default: '#4F8EF7' },
  emoji:    { type: String, default: '📓' },
  description: { type: String, default: '' },
  shareToken: { type: String, unique: true, sparse: true },
}, { timestamps: true });

subjectSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Subject', subjectSchema);