const { Resend } = require('resend');

const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada nas variáveis de ambiente.');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function emailBase(content) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0A0A14;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A14;padding:48px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#0F0F18;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
        <tr>
          <td style="padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <img src="https://i.imgur.com/jXDsNEh.png" alt="FlashMind Logo" width="48" style="vertical-align:middle;margin-right:8px;" />
            <span style="font-size:18px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;vertical-align:middle;">
              Flash<span style="color:#60a5fa;">Mind</span>
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
  const link = `${BASE_URL}/verify-email/${token}`;
  const resend = getResend();
  await resend.emails.send({
    from: 'FlashMind <juanrodrigues@flashmind.site>',
    to: user.email,
    subject: '✉️ Confirme seu e-mail — FlashMind',
    html: emailBase(`
      <h2 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
        Confirme seu e-mail ✉️
      </h2>
      <p style="margin:0 0 28px;font-size:14px;color:#94a3b8;line-height:1.7;">
        Olá, <strong style="color:#e2e8f0;">${user.name}</strong>!<br>
        Obrigado por criar sua conta no FlashMind. Clique no botão abaixo para confirmar seu e-mail.
      </p>
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Confirmar e-mail →
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#475569;line-height:1.6;">
        Este link expira em <strong style="color:#64748b;">24 horas</strong>.<br>
        Ou copie: <span style="color:#60a5fa;">${link}</span>
      </p>
    `),
  });
};

exports.sendPasswordResetEmail = async (user, token) => {
  const link = `${BASE_URL}/reset-password/${token}`;
  const resend = getResend();
  await resend.emails.send({
    from: 'FlashMind <juanrodrigues@flashmind.site>',
    to: user.email,
    subject: '🔑 Redefinir senha — FlashMind',
    html: emailBase(`
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
    `),
  });
};

// Confirmação de troca de e-mail — enviada ao endereço NOVO.
// É o que prova que o usuário controla a caixa para a qual quer migrar.
exports.sendEmailChangeConfirmation = async (user, newEmail, token) => {
  const link = `${BASE_URL}/confirm-email-change/${token}`;
  const resend = getResend();
  await resend.emails.send({
    from: 'FlashMind <juanrodrigues@flashmind.site>',
    to: newEmail,
    subject: '🔄 Confirme seu novo e-mail — FlashMind',
    html: emailBase(`
      <h2 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
        Confirme seu novo e-mail 🔄
      </h2>
      <p style="margin:0 0 28px;font-size:14px;color:#94a3b8;line-height:1.7;">
        Olá, <strong style="color:#e2e8f0;">${user.name}</strong>!<br>
        Você pediu para trocar o e-mail da sua conta FlashMind para
        <strong style="color:#e2e8f0;">${newEmail}</strong>.
        Confirme abaixo para concluir a troca.
      </p>
      <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Confirmar novo e-mail →
      </a>
      <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
        <tr>
          <td style="background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.2);border-radius:10px;padding:14px 18px;">
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;">
              ⏱ Expira em <strong style="color:#94a3b8;">1 hora</strong>.<br>
              🔒 Até você confirmar, o acesso continua pelo e-mail antigo.
            </p>
          </td>
        </tr>
      </table>
    `),
  });
};

// Aviso ao endereço ANTIGO. Se a troca não foi o usuário, é por aqui que ele
// descobre a tempo — mandar só para o novo endereço esconderia o sequestro.
exports.sendEmailChangeNotice = async (user, newEmail) => {
  const resend = getResend();
  await resend.emails.send({
    from: 'FlashMind <juanrodrigues@flashmind.site>',
    to: user.email,
    subject: '⚠️ Solicitação de troca de e-mail — FlashMind',
    html: emailBase(`
      <h2 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
        Pediram para trocar seu e-mail ⚠️
      </h2>
      <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.7;">
        Olá, <strong style="color:#e2e8f0;">${user.name}</strong>.<br>
        Recebemos um pedido para mudar o e-mail da sua conta para
        <strong style="color:#e2e8f0;">${newEmail}</strong>.
      </p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 18px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
              <strong style="color:#f87171;">Não foi você?</strong><br>
              Troque sua senha imediatamente — alguém pode ter acesso à sua conta.
              A troca só se conclui se o link enviado ao novo endereço for aberto.
            </p>
          </td>
        </tr>
      </table>
    `),
  });
};

// Testa conexão com Resend
exports.testConnection = async () => {
  const resend = getResend();
  // Só verifica se a chave existe e o cliente inicializa
  return !!resend;
};