require('dotenv').config();
const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp           = require('hpp');
const connectDB     = require('./src/config/db');

const authRoutes      = require('./src/routes/auth');
const deckRoutes      = require('./src/routes/decks');
const flashcardRoutes = require('./src/routes/flashcards');
const studyRoutes     = require('./src/routes/study');
const searchRoutes    = require('./src/routes/search');
const notebookRoutes  = require('./src/routes/notebook');
const adminRoutes     = require('./src/routes/admin');
const rankingRoutes   = require('./src/routes/ranking');

connectDB();

const app = express();

// Necessário para rate limit funcionar corretamente atrás do proxy do Render
app.set('trust proxy', 1);

// ── Helmet ───────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://flashmind.site',
  'https://www.flashmind.site', 
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado: ${origin}`));
    }
  },
  credentials: true,
}));

// ── Body parsers ─────────────────────────────────────────────────────────────
// 50mb para rotas que recebem imagens/áudios em base64
app.use('/api/flashcards', express.json({ limit: '50mb' }));
app.use('/api/notebook',   express.json({ limit: '50mb' }));
// 1mb para todo o resto
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ── Fix: req.query mutável (Express 5 / proxy) ───────────────────────────────
app.use((req, _res, next) => {
  if (req.query) {
    try {
      Object.defineProperty(req, 'query', {
        value: { ...req.query },
        writable: true, configurable: true, enumerable: true,
      });
    } catch {}
  }
  next();
});

// ── Sanitização NoSQL ────────────────────────────────────────────────────────
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠ NoSQL injection bloqueado — key: ${key} — IP: ${req.ip}`);
  },
}));

// ── HPP ──────────────────────────────────────────────────────────────────────
app.use(hpp());
app.disable('x-powered-by');

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde 15 minutos.' },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas solicitações de e-mail. Aguarde 1 hora.' },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em minutos.' },
});

app.use(globalLimiter);
app.use('/api/auth/login',               authLimiter);
app.use('/api/auth/register',            authLimiter);
app.use('/api/auth/forgot-password',     emailLimiter);
app.use('/api/auth/resend-verification', emailLimiter);
// Ambas recebem a senha atual no corpo — sem limite, viram alvo de força bruta
// para quem já tem uma sessão. change-email também dispara envio de e-mail.
app.use('/api/auth/change-password',     authLimiter);
app.use('/api/auth/change-email',        emailLimiter);

// Área de equipe: lê dados de terceiros. Um limite próprio, mais apertado que
// o global, reduz o estrago caso uma sessão de staff seja comprometida.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições administrativas. Aguarde alguns minutos.' },
});
app.use('/api/admin', adminLimiter);

// Endpoint público de matéria compartilhada: sem sessão, então só o IP limita.
// Sem isto, dá para varrer tokens em força bruta.
const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em minutos.' },
});
app.use('/api/notebook/subjects/share', shareLimiter);
app.use('/api/decks/share',             shareLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Rotas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/decks',      deckRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/study',      studyRoutes);
app.use('/api/search',     searchRoutes);
app.use('/api/notebook',   notebookRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/ranking',    rankingRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large')
    return res.status(413).json({ message: 'Arquivo muito grande.' });
  const isDev = process.env.NODE_ENV === 'development';
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    message: isDev ? err.message : 'Algo deu errado no servidor.',
    ...(isDev && { stack: err.stack }),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);

  if (process.env.RESEND_API_KEY) {
    console.log('✅ Resend configurado — e-mails funcionando');
  } else {
    console.warn('⚠ RESEND_API_KEY não configurada — e-mails desativados');
  }
});