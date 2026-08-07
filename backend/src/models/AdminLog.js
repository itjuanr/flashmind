const mongoose = require('mongoose');

/**
 * Registro das ações administrativas sensíveis.
 *
 * Antes isso existia só como console.log, que no Render é efêmero: depois de
 * um deploy ou reinício, o rastro sumia. Como essas ações são capazes de
 * tomar contas (promover a admin, redirecionar e-mail), o registro precisa
 * sobreviver e ser consultável.
 *
 * Só grava metadados — nunca tokens nem senhas.
 */
const AdminLogSchema = new mongoose.Schema({
  autorId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  autorEmail: { type: String, required: true },
  acao:       { type: String, required: true }, // 'cargo' | 'reset-senha' | 'troca-email'
  alvoId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  alvoEmail:  { type: String },
  detalhe:    { type: String, default: '' },
  ip:         { type: String, default: '' },
}, { timestamps: true });

AdminLogSchema.index({ createdAt: -1 });
AdminLogSchema.index({ autorId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', AdminLogSchema);
