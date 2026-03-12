const mongoose = require('mongoose');

const FlashcardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deckId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  front: { type: String, default: '' },
  back:  { type: String, default: '' },
  frontImage: { type: String, default: null },
  backImage:  { type: String, default: null },
  frontAudio: { type: String, default: null }, // Base64 ou URL
  backAudio:  { type: String, default: null },
  notes:      { type: String, default: '' },
  isFavorite: { type: Boolean, default: false },
  level: { type: Number, default: 0 },
  nextReview: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, { timestamps: true });

module.exports = mongoose.model('Flashcard', FlashcardSchema);