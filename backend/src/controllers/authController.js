const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User   = require('../models/User');
const {
  sendConfirmationEmail, sendPasswordResetEmail,
  sendEmailChangeConfirmation, sendEmailChangeNotice,
} = require('../config/email');

const signToken = (id) => jwt.sign({ id: id.toString() }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '30m',
});

const userPayload = (user) => ({
  id: user._id.toString(), name: user.name, email: user.email,
  dailyGoal: user.dailyGoal, isVerified: user.isVerified,
  studyGoal: user.studyGoal, studyArea: user.studyArea,
  avatar: user.avatar || null,
  pendingEmail: user.pendingEmail || null,
  // Só para o frontend decidir o que desenhar. Nunca é a barreira de acesso:
  // quem valida é o adminOnly, lendo o papel do banco a cada requisição.
  role: user.role || 'user',
});

// Mesma regra usada no reset de senha — mantida em um só lugar.
const PASS_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
const PASS_MSG = 'A senha deve ter no mínimo 8 caracteres, contendo letras maiúsculas, minúsculas, números e símbolos.';

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
    
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
    if (!passRegex.test(password))
      return res.status(400).json({ message: 'A senha deve ter no mínimo 8 caracteres, contendo letras maiúsculas, minúsculas, números e símbolos.' });

    const exists = await User.findOne({ email: new RegExp(`^${email}$`, 'i') }).select('_id').lean();
    if (exists) return res.status(400).json({ message: 'Este e-mail já está cadastrado.' });

    const hashed      = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name, email, password: hashed,
      studyGoal, studyArea, howFound,
      verifyToken,
      verifyTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Responde ao cliente imediatamente com o token validado
    res.status(201).json({ token: signToken(user._id), user: userPayload(user) });

    // Delega o envio do e-mail de confirmação para background (não bloqueia a UI)
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

    // Utiliza Regex case-insensitive para suportar contas criadas com e-mail em UpperCase
    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') }).select('+password');
    if (!user) {
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
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    res.json(userPayload(user));
  } catch (e) { res.status(500).json({ message: 'Erro ao buscar usuário.' }); }
};

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
exports.updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const { dailyGoal, studyGoal, studyArea, name, avatar } = req.body;
    if (dailyGoal !== undefined) user.dailyGoal = Math.max(0, Math.min(1000, parseInt(dailyGoal) || 0));
    if (studyGoal !== undefined) user.studyGoal = sanitize(studyGoal, 50);
    if (studyArea !== undefined) user.studyArea = sanitize(studyArea, 50);

    if (name !== undefined) {
      const clean = sanitize(name, 100);
      if (!clean) return res.status(400).json({ message: 'O nome não pode ficar vazio.' });
      user.name = clean;
    }

    if (avatar !== undefined) {
      if (avatar === null || avatar === '') {
        user.avatar = null;
      } else {
        if (typeof avatar !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(avatar))
          return res.status(400).json({ message: 'Formato de imagem inválido.' });
        // ~2MB depois do base64 (que infla ~33% sobre o binário original).
        if (avatar.length > 2_800_000)
          return res.status(400).json({ message: 'Imagem muito grande. Use uma de até 2MB.' });
        user.avatar = avatar;
      }
    }

    await user.save();
    res.json(userPayload(user));
  } catch (e) { res.status(500).json({ message: 'Erro ao atualizar perfil.' }); }
};

// ── POST /api/auth/change-password ───────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword     = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

    if (!PASS_REGEX.test(newPassword)) return res.status(400).json({ message: PASS_MSG });

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    // Exigir a senha atual impede que uma sessão sequestrada troque a senha.
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: 'Senha atual incorreta.' });

    if (await bcrypt.compare(newPassword, user.password))
      return res.status(400).json({ message: 'A nova senha precisa ser diferente da atual.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Senha alterada com sucesso!' });
  } catch (e) { res.status(500).json({ message: 'Erro ao alterar senha.' }); }
};

// ── POST /api/auth/change-email ──────────────────────────────────────────────
exports.requestEmailChange = async (req, res) => {
  try {
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const newEmail = sanitize(req.body.newEmail, 200).toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
      return res.status(400).json({ message: 'E-mail inválido.' });

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Senha incorreta.' });

    if (newEmail === user.email)
      return res.status(400).json({ message: 'Este já é o seu e-mail atual.' });

    const taken = await User.findOne({ email: newEmail });
    if (taken) return res.status(400).json({ message: 'Este e-mail já está em uso.' });

    const token = crypto.randomBytes(32).toString('hex');
    const cancelToken = crypto.randomBytes(32).toString('hex');
    user.pendingEmail           = newEmail;
    user.emailChangeToken       = token;
    user.emailChangeExpires     = new Date(Date.now() + 60 * 60 * 1000);
    user.emailChangeCancelToken = cancelToken;
    user.emailChangeRequestedBy = null; // pedido pelo próprio dono
    await user.save();

    res.json({ message: `Enviamos um link de confirmação para ${newEmail}.`, pendingEmail: newEmail });

    const oldAddress = user.email;
    setImmediate(() => {
      sendEmailChangeConfirmation(user, newEmail, token)
        .catch(e => console.error('Erro ao enviar confirmação de troca:', e.message));
      // Aviso ao endereço antigo, com link de veto — é a rede de segurança
      // se a conta foi tomada.
      sendEmailChangeNotice({ name: user.name, email: oldAddress }, newEmail, cancelToken)
        .catch(e => console.error('Erro ao avisar e-mail antigo:', e.message));
    });
  } catch (e) { res.status(500).json({ message: 'Erro ao solicitar troca de e-mail.' }); }
};

// ── GET /api/auth/cancel-email-change/:token ─────────────────────────────────
// Veto do endereço ANTIGO. Público e sem login de propósito: quem precisa
// cancelar pode estar justamente sem acesso à conta. Mata a solicitação e
// invalida o link de confirmação já enviado ao novo endereço.
exports.cancelEmailChange = async (req, res) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token))
      return res.status(400).json({ message: 'Token inválido.' });

    const user = await User.findOne({ emailChangeCancelToken: req.params.token });
    if (!user || !user.pendingEmail)
      return res.status(400).json({ message: 'Esta solicitação não existe mais ou já foi resolvida.' });

    user.pendingEmail           = undefined;
    user.emailChangeToken       = undefined;
    user.emailChangeExpires     = undefined;
    user.emailChangeCancelToken = undefined;
    user.emailChangeRequestedBy = undefined;
    await user.save();

    console.log(`[SEGURANCA] Troca de e-mail cancelada pelo endereco antigo: ${user.email}`);
    res.json({ message: 'Solicitação cancelada. Seu e-mail continua o mesmo.' });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao cancelar a solicitação.' });
  }
};

// ── GET /api/auth/confirm-email-change/:token ────────────────────────────────
exports.confirmEmailChange = async (req, res) => {
  try {
    if (!/^[a-f0-9]{64}$/.test(req.params.token))
      return res.status(400).json({ message: 'Token inválido.' });

    const user = await User.findOne({
      emailChangeToken: req.params.token,
      emailChangeExpires: { $gt: new Date() },
    });
    if (!user || !user.pendingEmail)
      return res.status(400).json({ message: 'Link inválido ou expirado. Solicite novamente.' });

    // Recheca no momento da confirmação: alguém pode ter registrado esse
    // endereço entre o pedido e o clique.
    const taken = await User.findOne({ email: user.pendingEmail, _id: { $ne: user._id } });
    if (taken) {
      user.pendingEmail = undefined;
      user.emailChangeToken = undefined;
      user.emailChangeExpires = undefined;
      await user.save();
      return res.status(400).json({ message: 'Este e-mail foi registrado por outra conta. Tente outro.' });
    }

    user.email       = user.pendingEmail;
    user.isVerified  = true; // o clique no link já provou a posse do endereço
    user.pendingEmail           = undefined;
    user.emailChangeToken       = undefined;
    user.emailChangeExpires     = undefined;
    user.emailChangeCancelToken = undefined;
    user.emailChangeRequestedBy = undefined;
    await user.save();

    res.json({ message: 'E-mail alterado com sucesso!', email: user.email });
  } catch (e) { res.status(500).json({ message: 'Erro ao confirmar troca de e-mail.' }); }
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
  const SAFE_MSG = 'Se este e-mail estiver cadastrado, você receberá um link em breve.';
  try {
    const email = sanitize(req.body.email, 200).toLowerCase();
    if (!email) return res.json({ message: SAFE_MSG });

    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!user) return res.json({ message: SAFE_MSG });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken        = token;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    res.json({ message: SAFE_MSG });

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
    
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
    if (!passRegex.test(password))
      return res.status(400).json({ message: 'A nova senha deve ter no mínimo 8 caracteres, contendo letras maiúsculas, minúsculas, números e símbolos.' });

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
    if (!req.user.id) return res.status(401).json({ message: 'Não autorizado.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    if (user.isVerified) return res.status(400).json({ message: 'E-mail já verificado.' });

    // Rate limiter customizado: Permite o reenvio de confirmação a cada 1 minuto
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