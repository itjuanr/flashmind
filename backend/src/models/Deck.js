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
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null,
  },
}, { timestamps: true });

// Toda listagem de deck filtra por dono; a de matéria filtra pelos dois juntos.
// Sem isto o Mongo varre a coleção inteira a cada abertura da Dashboard.
deckSchema.index({ userId: 1, createdAt: -1 });
deckSchema.index({ userId: 1, subjectId: 1 });
deckSchema.index({ userId: 1, deletedAt: 1 });

// ── Exclusão reversível ───────────────────────────────────────────────────────
// Antes, excluir um deck apagava ele e TODOS os seus flashcards de vez. Um
// clique errado destruía centenas de cards sem volta.
//
// O filtro fica no schema, não nas ~20 consultas espalhadas por 7 arquivos:
// bastaria esquecer uma para um deck excluído reaparecer na busca, no estudo
// ou nas estatísticas.
deckSchema.add({ deletedAt: { type: Date, default: null } });

// Sem parâmetro `next`: nesta versão do Mongoose o middleware de query não
// recebe callback, e declará-lo quebrava toda consulta com "next is not a
// function". Hook sem argumento é tratado como síncrono.
function ocultarExcluidos() {
  // Quem cita deletedAt explicitamente (a lixeira) mantém o próprio filtro.
  if (!('deletedAt' in this.getQuery())) this.where({ deletedAt: null });
}

['find', 'findOne', 'findOneAndUpdate', 'countDocuments']
  .forEach((op) => deckSchema.pre(op, { query: true, document: false }, ocultarExcluidos));

// Agregações não passam pelo middleware de query — precisam do próprio estágio.
deckSchema.pre('aggregate', function () {
  this.pipeline().unshift({ $match: { deletedAt: null } });
});

module.exports = mongoose.model('Deck', deckSchema);