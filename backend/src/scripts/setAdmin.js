/**
 * Concede ou revoga o papel de administrador.
 *
 *   node src/scripts/setAdmin.js juan@email.com          → promove
 *   node src/scripts/setAdmin.js juan@email.com --remove → rebaixa
 *
 * Este é o ÚNICO caminho para virar admin: não existe rota que promova
 * ninguém. Quem promove precisa de acesso ao banco, então uma conta comprometida
 * na aplicação não consegue escalar privilégio por conta própria.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  const email  = (process.argv[2] || '').trim().toLowerCase();
  const remove = process.argv.includes('--remove');

  if (!email) {
    console.error('Uso: node src/scripts/setAdmin.js <email> [--remove]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`Nenhum usuário com o e-mail "${email}".`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const novoPapel = remove ? 'user' : 'admin';
  if (user.role === novoPapel) {
    console.log(`"${user.name}" <${user.email}> já é ${novoPapel}. Nada a fazer.`);
  } else {
    user.role = novoPapel;
    await user.save();
    console.log(`"${user.name}" <${user.email}> agora é ${novoPapel}.`);
  }

  if (remove) {
    const restantes = await User.countDocuments({ role: 'admin' });
    if (restantes === 0) console.warn('⚠ Não há mais nenhum administrador no sistema.');
  }

  await mongoose.disconnect();
})().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
