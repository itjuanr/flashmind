const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User   = require('../models/User');
const { sendConfirmationEmail, sendPasswordResetEmail } = require('../config/email');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
});

const userPayload = (user) => ({
  id: user._id, name: user.name, email: user.email,
  dailyGoal: user.dailyGoal, isVerified: user.isVerified,
  studyGoal: user.studyGoal, studyArea: user.studyArea,
});

// Sanitiza string — remove caracteres de controle e limita tamanho
const sanitize = (val, maxLen = 200) =>
  typeof val === 'string' ? val.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen) : '';

// ── POST /api/auth/register ───────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const name      = sanitize(req.body.name, 100);
    const email     = sanitize(req.body.email, 200).toLowerCase();
    const password  = typeof req.body.password === 'string' ? req.body.password : '';
    const studyGoal = sanitize(req.body.studyGoal, 50);
    const studyArea = sanitize(req.body.studyArea, 50);
    const howFound  = sanitize(req.body.howFound,  50);

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
    if (!/^\S+@\S+\.\S+$/.test(email))
      return res.status(400).json({ message: 'E-mail inválido.' });
    if (password.length < 6 || password.length > 128)
      return res.status(400).json({ message: 'A senha deve ter entre 6 e 128 caracteres.' });

    const exists = await User.findOne({ email }).select('_id').lean();
    if (exists) return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });

    const hashed      = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name, email, password: hashed,
      studyGoal, studyArea, howFound,
      verifyToken,
      verifyTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Responde imediatamente — não espera o e-mail ser enviado
    res.status(201).json({ token: signToken(user._id), user: userPayload(user) });

    // Envia e-mail em background (não bloqueia a resposta)
    setImmediate(() => {
      sendConfirmationEmail(user, verifyToken).catch(e => {
        console.error('Erro ao enviar e-mail de confirmação:', e.message);
      });
    });
  } catch (e) {
    console.error('register error:', e.message);
    res.status(500).json({ message: 'Erro ao registrar. Tente novamente.' });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const email    = sanitize(req.body.email, 200).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password)
      return res.status(400).json({ message: 'Informe e-mail e senha.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      // Timing attack: compara mesmo sem usuário para não revelar existência por timing
      await bcrypt.compare(password, '$2a$12$dummyhashfortimingattackprevention00000000000000000000');
      return res.status(401).json({ message: 'E-mail não encontrado.', field: 'email' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Senha incorreta.', field: 'password' });

    res.json({ token: signToken(user._id), user: userPayload(user) });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao fazer login.' });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    res.json(userPayload(user));
  } catch (e) { res.status(500).json({ message: 'Erro ao buscar usuário.' }); }
};

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const { dailyGoal, studyGoal, studyArea } = req.body;
    if (dailyGoal !== undefined) user.dailyGoal = Math.max(0, Math.min(1000, parseInt(dailyGoal) || 0));
    if (studyGoal !== undefined) user.studyGoal = sanitize(studyGoal, 50);
    if (studyArea !== undefined) user.studyArea = sanitize(studyArea, 50);
    await user.save();
    res.json(userPayload(user));
  } catch (e) { res.status(500).json({ message: 'Erro ao atualizar perfil.' }); }
};

// ── GET /api/auth/verify/:token ───────────────────────────────────────────────
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Token deve ser hex de 64 chars
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      return res.status(400).json({ message: 'Token inválido.' });

    // Busca apenas pelo token — sem filtrar pela expiração primeiro
    const user = await User.findOne({ verifyToken: token });

    if (!user) {
      // Verifica se já foi verificado anteriormente (token foi consumido)
      const verified = await User.findOne({ isVerified: true, verifyToken: null });
      // Não revela detalhes
      return res.status(400).json({ message: 'Link inválido ou já utilizado.' });
    }

    // Verifica expiração separadamente para dar mensagem mais clara
    if (user.verifyTokenExpires && user.verifyTokenExpires < new Date()) {
      return res.status(400).json({
        message: 'Link expirado. Use o botão "Reenviar e-mail" para receber um novo.',
        expired: true,
      });
    }

    user.isVerified         = true;
    user.verifyToken        = null;
    user.verifyTokenExpires = null;
    await user.save();

    res.json({ message: 'E-mail confirmado com sucesso!' });
  } catch (e) {
    console.error('verifyEmail error:', e.message);
    res.status(500).json({ message: 'Erro ao verificar e-mail.' });
  }
};

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  // Sempre retorna a mesma resposta para não revelar se o e-mail existe
  const SAFE_MSG = 'Se este e-mail estiver cadastrado, você receberá um link em breve.';
  try {
    const email = sanitize(req.body.email, 200).toLowerCase();
    if (!email) return res.json({ message: SAFE_MSG });

    const user = await User.findOne({ email });
    if (!user) return res.json({ message: SAFE_MSG });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken        = token;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Responde imediatamente
    res.json({ message: SAFE_MSG });

    // Envia e-mail em background
    setImmediate(() => {
      sendPasswordResetEmail(user, token).catch(e => {
        console.error('Erro ao enviar e-mail de reset:', e.message);
      });
    });
  } catch (e) { res.status(500).json({ message: 'Erro ao processar solicitação.' }); }
};

// ── POST /api/auth/reset-password/:token ─────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token))
      return res.status(400).json({ message: 'Token inválido.' });

    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (password.length < 6 || password.length > 128)
      return res.status(400).json({ message: 'A nova senha deve ter entre 6 e 128 caracteres.' });

    const user = await User.findOne({
      resetToken: req.params.token,
      resetTokenExpires: { $gt: new Date() },
    }).select('+password');
    if (!user) return res.status(400).json({ message: 'Link inválido ou expirado. Solicite um novo.' });

    user.password          = await bcrypt.hash(password, 10);
    user.resetToken        = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ message: 'Senha redefinida com sucesso! Faça login com a nova senha.' });
  } catch (e) { res.status(500).json({ message: 'Erro ao redefinir senha.' }); }
};

// ── POST /api/auth/resend-verification ───────────────────────────────────────
exports.resendVerification = async (req, res) => {
  try {
    // req.user vem do middleware protect — se chegou aqui, o token é válido
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Não autorizado.' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    if (user.isVerified) return res.status(400).json({ message: 'E-mail já verificado.' });

    // Cooldown suave: 1 minuto entre reenvios (não 23h)
    if (
      user.verifyTokenExpires &&
      user.verifyTokenExpires > new Date(Date.now() + (24 * 60 * 60 * 1000) - 60 * 1000)
    ) {
      return res.status(429).json({ message: 'Aguarde 1 minuto antes de solicitar outro e-mail.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.verifyToken        = token;
    user.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    res.json({ message: 'E-mail de confirmação reenviado!' });

    setImmediate(() => {
      sendConfirmationEmail(user, token).catch(e => {
        console.error('Erro ao reenviar confirmação:', e.message);
      });
    });
  } catch (e) {
    console.error('resendVerification error:', e.message);
    res.status(500).json({ message: 'Erro ao reenviar e-mail.' });
  }
};