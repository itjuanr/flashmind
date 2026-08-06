const mongoose = require('mongoose');

const FlashcardSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deckId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  front:      { type: String, default: '' },
  back:       { type: String, default: '' },
  frontImage: { type: String, default: null },
  backImage:  { type: String, default: null },
  frontAudio: { type: String, default: null },
  backAudio:  { type: String, default: null },
  notes:      { type: String, default: '' },
  cardColor:  { type: String, default: null }, // cor de destaque opcional
  position:   { type: Number, default: 0 },    // para drag and drop
  isFavorite: { type: Boolean, default: false },
  level:      { type: Number, default: 0 },
  nextReview: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
}, { timestamps: true });

// Índices compostos para máxima performance nas consultas (Dashboard e Modo Estudo)
FlashcardSchema.index({ userId: 1, deckId: 1 });
// As agregações de contagem filtram só por deckId ($in). O índice composto
// acima não serve para isso: um índice só é usado a partir do seu prefixo.
FlashcardSchema.index({ deckId: 1 });
FlashcardSchema.index({ userId: 1, nextReview: 1 });

// Índice de Texto para buscas globais ultra-rápidas e otimizadas
FlashcardSchema.index({ front: 'text', back: 'text', notes: 'text' });

module.exports = mongoose.model('Flashcard', FlashcardSchema);