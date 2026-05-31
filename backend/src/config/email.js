const nodemailer = require('nodemailer');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Cria transporter sob demanda para garantir que as env vars já foram carregadas
function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('EMAIL_USER e EMAIL_PASS não configurados nas variáveis de ambiente.');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function emailBase(title, content) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A14;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A14;padding:48px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#0F0F18;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">

        <tr>
          <td style="padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
              ⚡ Flash<span style="color:#60a5fa;">Mind</span>
            </span>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 36px 28px;">
            ${content}
          </td>
        </tr>

        <tr>
          <td style="padding:20px 36px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;font-size:11px;color:#475569;line-height:1.6;">
              FlashMind · Memorize mais, estude melhor.<br>
              Se você não solicitou este e-mail, pode ignorá-lo com segurança.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

exports.sendConfirmationEmail = async (user, token) => {
  const link = `${process.env.FRONTEND_URL || BASE_URL}/verify-email/${token}`;
  const html = emailBase('Confirme seu e-mail — FlashMind', `
    <h2 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
      Confirme seu e-mail ✉️
    </h2>
    <p style="margin:0 0 28px;font-size:14px;color:#94a3b8;line-height:1.7;">
      Olá, <strong style="color:#e2e8f0;">${user.name}</strong>!<br>
      Obrigado por criar sua conta no FlashMind. Clique no botão abaixo para confirmar seu e-mail e começar a estudar.
    </p>
    <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      Confirmar e-mail →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#475569;line-height:1.6;">
      Este link expira em <strong style="color:#64748b;">24 horas</strong>.<br>
      Ou copie: <span style="color:#60a5fa;">${link}</span>
    </p>
  `);

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"FlashMind" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: '✉️ Confirme seu e-mail — FlashMind',
    html,
  });
};

exports.sendPasswordResetEmail = async (user, token) => {
  const link = `${process.env.FRONTEND_URL || BASE_URL}/reset-password/${token}`;
  const html = emailBase('Redefinir senha — FlashMind', `
    <h2 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
      Redefinir senha 🔑
    </h2>
    <p style="margin:0 0 28px;font-size:14px;color:#94a3b8;line-height:1.7;">
      Olá, <strong style="color:#e2e8f0;">${user.name}</strong>!<br>
      Recebemos uma solicitação para redefinir a senha da sua conta FlashMind.
    </p>
    <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      Redefinir minha senha →
    </a>
    <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
      <tr>
        <td style="background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.2);border-radius:10px;padding:14px 18px;">
          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
            ⏱ Expira em <strong style="color:#94a3b8;">1 hora</strong>.<br>
            🔒 Se não foi você, ignore este e-mail.
          </p>
        </td>
      </tr>
    </table>
  `);

  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"FlashMind" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: '🔑 Redefinir senha — FlashMind',
    html,
  });
};