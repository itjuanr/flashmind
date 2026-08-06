const StudySession = require('../models/StudySession');
const User = require('../models/User');

const DIA_MS = 24 * 60 * 60 * 1000;
const JANELA_DIAS = 365;

/**
 * Pontuação:
 *   base     = cards revisados
 *   precisão = base × (acertos / respostas)   → estudar bem vale até o dobro
 *   ofensiva = dias seguidos × 20
 *
 * Usar a contagem de cards como base (e não a porcentagem pura) evita o
 * incentivo perverso de responder 1 card certo e ficar com 100% de precisão.
 */
function calcularPontos({ cards, acertos, erros, ofensiva }) {
  const respostas = acertos + erros;
  const precisao = respostas > 0 ? acertos / respostas : 0;
  return {
    pontos: Math.round(cards + cards * precisao + ofensiva * 20),
    precisao: Math.round(precisao * 100),
  };
}

/**
 * Dias consecutivos de estudo. Conta para trás a partir de hoje; se não
 * estudou hoje, aceita ontem como início — senão a ofensiva "quebraria"
 * durante o próprio dia, antes da pessoa estudar.
 */
function calcularOfensiva(dias) {
  if (!dias.length) return 0;

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const marcos = new Set(dias.map((d) => new Date(d).setHours(0, 0, 0, 0)));

  let inicio = hoje.getTime();
  if (!marcos.has(inicio)) {
    inicio -= DIA_MS;
    if (!marcos.has(inicio)) return 0;
  }

  let total = 0;
  for (let t = inicio; marcos.has(t); t -= DIA_MS) total++;
  return total;
}

async function montarPlacar() {
  const desde = new Date(Date.now() - JANELA_DIAS * DIA_MS);

  const agregado = await StudySession.aggregate([
    { $match: { studiedAt: { $gte: desde } } },
    {
      $group: {
        _id: '$userId',
        cards:   { $sum: '$totalCards' },
        acertos: { $sum: '$correct' },
        erros:   { $sum: '$wrong' },
        dias:    { $addToSet: '$studiedAt' },
      },
    },
  ]);

  if (!agregado.length) return [];

  // Sem avatar: é data URI de até ~2,8MB e o placar lista dezenas de pessoas.
  const usuarios = await User.find({ _id: { $in: agregado.map((a) => a._id) } })
    .select('name').lean();
  const nomes = new Map(usuarios.map((u) => [u._id.toString(), u.name]));

  return agregado
    .map((a) => {
      const ofensiva = calcularOfensiva(a.dias);
      const { pontos, precisao } = calcularPontos({ ...a, ofensiva });
      return {
        userId: a._id.toString(),
        nome: nomes.get(a._id.toString()) || 'Usuário',
        cards: a.cards,
        precisao,
        ofensiva,
        pontos,
      };
    })
    // Usuários apagados continuariam no agregado das sessões antigas.
    .filter((l) => nomes.has(l.userId))
    .sort((a, b) => b.pontos - a.pontos)
    .map((l, i) => ({ ...l, posicao: i + 1 }));
}

// GET /api/ranking
exports.getRanking = async (req, res) => {
  try {
    const placar = await montarPlacar();
    const eu = placar.find((l) => l.userId === req.user.id) || null;

    res.json({
      top: placar.slice(0, 50),
      eu, // devolvido à parte para aparecer mesmo fora do top 50
      totalParticipantes: placar.length,
    });
  } catch (e) {
    res.status(500).json({ message: 'Erro ao carregar o ranking.' });
  }
};
