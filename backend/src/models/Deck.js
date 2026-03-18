const mongoose = require('mongoose');


const deckSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: [true, 'Adicione um nome para o deck'] },
  description: { type: String },
  color:       { type: String, default: '#4F8EF7' },
  emoji:       { type: String, default: '📚' },
  deckImage:   { type: String, default: null },
  isFavorite:  { type: Boolean, default: false },
  tags:        { type: [String], default: [] },
  shareToken:  { type: String, unique: true, sparse: true },
  reviewSettings: {
    notify:       { type: Boolean, default: true },
    newCardDelay: { type: Number,  default: 1, enum: [1, 7, 14] },
  },
}, { timestamps: true });

module.exports = mongoose.model('Deck', deckSchema);