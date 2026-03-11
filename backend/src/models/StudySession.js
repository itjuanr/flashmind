const mongoose = require('mongoose');

const StudySessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  totalCards: { type: Number, required: true },
  correct: { type: Number, default: 0 },
  wrong: { type: Number, default: 0 },
  // Data sem hora — facilita consulta "estudados hoje"
  studiedAt: {
    type: Date,
    default: () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('StudySession', StudySessionSchema);