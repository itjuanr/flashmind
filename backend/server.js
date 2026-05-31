require('dotenv').config();
const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const mongoSanitize  = require('express-mongo-sanitize');
const hpp            = require('hpp');
const connectDB      = require('./src/config/db');

// Rotas
const authRoutes      = require('./src/routes/auth');
const deckRoutes      = require('./src/routes/decks');
const flashcardRoutes = require('./src/routes/flashcards');
const studyRoutes     = require('./src/routes/study');
const searchRoutes    = require('./src/routes/search');
const notebookRoutes  = require('./src/routes/notebook');

connectDB();

const app = express();
app.set('trust proxy', 1);

// ── 1. Helmet — headers de segurança HTTP ────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── 2. CORS — origens permitidas ─────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
}));

// ── 3. Rate limiting ──────────────────────────────────────────────────────────
// Global: 200 req/15min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas requisições. Tente novamente em alguns minutos.' },
}));

// Auth: 10 tentativas/15min (brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
  skipSuccessfulRequests: true, // só conta erros
});

// E-mail reset/verify: 5/hora (previne spam)
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Muitas solicitações de e-mail. Aguarde 1 hora.' },
});

// ── 4. Body parser com limite seguro ─────────────────────────────────────────
app.use('/api/flashcards', express.json({ limit: '50mb' }));
app.use('/api/notebook',   express.json({ limit: '50mb' }));
app.use(express.json({ limit: '1mb' })); // padrão para todo o resto
app.use(express.urlencoded({ limit: '1mb', extended: true }));


// ── CORREÇÃO EXPRESS 5: Desbloquear mutabilidade do req.query ────────────────
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: { ...req.query },
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
  next();
});


// ── 5. Sanitização contra NoSQL injection ────────────────────────────────────
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠ NoSQL injection bloqueado — key: ${key} — IP: ${req.ip}`);
  },
}));

// ── 6. HPP — proteção contra poluição de parâmetros HTTP ─────────────────────
app.use(hpp());

// ── 7. Remover header que revela tecnologia ───────────────────────────────────
app.disable('x-powered-by');

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));


// ── CORREÇÃO DOS LIMITERS: Aplicando direto nos caminhos corretos ─────────────
app.use('/api/auth/login',                authLimiter);
app.use('/api/auth/register',             authLimiter);
app.use('/api/auth/forgot-password',      emailLimiter);
app.use('/api/auth/resend-verification',  emailLimiter);


// ── Rotas principais ──────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/decks',      deckRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/study',      studyRoutes);
app.use('/api/search',     searchRoutes);
app.use('/api/notebook',   notebookRoutes);

// ── Handler de erros ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'O arquivo ou texto enviado é muito grande.' });
  }

  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    message: isDev ? err.message : 'Algo deu errado no servidor.',
    ...(isDev && { stack: err.stack }),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
