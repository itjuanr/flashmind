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
// Reusa o connectDB do app: ele força DNS 8.8.8.8/1.1.1.1, sem o que resolvers
// que não fazem lookup SRV falham com querySrv ECONNREFUSED.
const connectDB = require('../config/db');
const User = require('../models/User');

(async () => {
  const email  = (process.argv[2] || '').trim().toLowerCase();
  const remove = process.argv.includes('--remove');
  const argRole = (process.argv[3] || '').trim().toLowerCase();

  if (!email || (argRole && !['user', 'ti', 'admin'].includes(argRole))) {
    console.error('Uso: node src/scripts/setAdmin.js <email> [user|ti|admin]');
    console.error('     node src/scripts/setAdmin.js <email> --remove   (equivale a "user")');
    process.exit(1);
  }

  await connectDB();

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`Nenhum usuário com o e-mail "${email}".`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const novoPapel = remove ? 'user' : (argRole || 'admin');
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
