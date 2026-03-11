require("node:dns/promises").setServers(["8.8.8.8", "1.1.1.1"]);
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Deck = require('../models/Deck');

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado ao MongoDB...');

  const result = await Deck.updateMany(
    { reviewSettings: { $exists: false } },
    { $set: { reviewSettings: { notify: true, newCardDelay: 1 } } }
  );

  console.log(`✅ ${result.modifiedCount} deck(s) atualizado(s) com reviewSettings padrão`);
  await mongoose.disconnect();
}

migrate().catch((err) => { console.error(err); process.exit(1); });