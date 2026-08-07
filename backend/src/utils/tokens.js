const crypto = require('crypto');

/**
 * Tokens de e-mail (verificação, reset, troca de endereço) eram gravados no
 * banco exatamente como saíam no link. Um vazamento do banco entregaria
 * links de redefinição prontos para uso.
 *
 * Agora vale a mesma lógica de senha: o e-mail leva o valor original, o banco
 * guarda só o resumo. Quem lê o banco não consegue montar um link válido.
 *
 * SHA-256 sem sal é adequado aqui (diferente de senha): o token tem 256 bits
 * de entropia aleatória, então não há dicionário nem força bruta viável.
 */
function gerarToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/** Formato do token que viaja no link — 64 hex. */
const FORMATO_TOKEN = /^[a-f0-9]{64}$/;

module.exports = { gerarToken, hashToken, FORMATO_TOKEN };
