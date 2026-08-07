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
subjectSchema.index({ userId: 1, deletedAt: 1 });

// ── Exclusão reversível ───────────────────────────────────────────────────────
// Excluir uma matéria apagava ela e TODAS as suas aulas de uma vez. Mesmo
// padrão do Deck: marca a data, esconde de toda consulta pelo schema, e as
// aulas ficam intactas.
//
// Efeito colateral desejado: um link público de matéria excluída para de
// resolver, porque getSharedSubject busca por shareToken e passa pelo filtro.
subjectSchema.add({ deletedAt: { type: Date, default: null } });

// Sem parâmetro `next`: nesta versão do Mongoose o middleware de query não
// recebe callback, e declará-lo quebra toda consulta.
function ocultarExcluidas() {
  if (!('deletedAt' in this.getQuery())) this.where({ deletedAt: null });
}

['find', 'findOne', 'findOneAndUpdate', 'countDocuments']
  .forEach((op) => subjectSchema.pre(op, { query: true, document: false }, ocultarExcluidas));

subjectSchema.pre('aggregate', function () {
  this.pipeline().unshift({ $match: { deletedAt: null } });
});

module.exports = mongoose.model('Subject', subjectSchema);