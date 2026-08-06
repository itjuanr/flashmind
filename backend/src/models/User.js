const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  // Autorização. Só é concedido pelo script scripts/setAdmin.js, que exige
  // acesso direto ao banco — não há rota que promova ninguém a admin.
  role:      { type: String, enum: ['user', 'admin'], default: 'user' },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, select: false },
  dailyGoal: { type: Number, default: 0 },

  // Perfil estendido
  studyGoal:     { type: String, default: '' }, // concurso, faculdade, idioma, curiosidade...
  studyArea:     { type: String, default: '' }, // exatas, humanas, saude, tecnologia...
  howFound:      { type: String, default: '' }, // como conheceu o FlashMind

  // Verificação de e-mail
  isVerified:         { type: Boolean, default: false },
  verifyToken:        { type: String, default: null },
  verifyTokenExpires: { type: Date,   default: null },

  // Redefinição de senha
  resetToken:         { type: String, default: null },
  resetTokenExpires:  { type: Date,   default: null },

  // Foto de perfil (data URI, mesmo padrão de deckImage)
  avatar: { type: String, default: null },

  // Troca de e-mail — o novo endereço só entra em `email` depois de confirmado
  // pelo link enviado a ele. Até lá fica estacionado em pendingEmail.
  pendingEmail:       { type: String, default: null },
  emailChangeToken:   { type: String, default: null },
  emailChangeExpires: { type: Date,   default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);