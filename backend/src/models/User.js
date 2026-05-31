const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
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
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);