require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Rotas
const authRoutes = require('./src/routes/auth');
const deckRoutes = require('./src/routes/decks');
const flashcardRoutes = require('./src/routes/flashcards');
const studyRoutes = require('./src/routes/study');
const searchRoutes   = require('./src/routes/search');
const notebookRoutes = require('./src/routes/notebook');

connectDB();

const app = express();

const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sem origin (Postman, mobile, etc) e origens permitidas
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado: ${origin}`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/study',     studyRoutes);
app.use('/api/search',    searchRoutes);
app.use('/api/notebook',  notebookRoutes);

// Handler genérico de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Algo deu errado no servidor.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));