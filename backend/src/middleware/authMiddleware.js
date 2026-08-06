const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Não autorizado. Faça login.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
    }

    // Padroniza as chaves do usuário (garantindo ObjectId e String formatada)
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      isVerified: user.isVerified,
      role: user.role || 'user',
    };

    next();
  } catch (error) {
    console.error('Erro no AuthMiddleware:', error.message);
    res.status(401).json({ message: 'Sessão expirada ou inválida.' });
  }
};

// Autorização de administrador. Roda sempre DEPOIS de `protect`, que é quem
// preenche req.user a partir do banco — o papel nunca vem do token nem do
// cliente, então forjar um JWT não basta para virar admin.
//
// Esta é a única barreira real: a rota /admin do frontend é pública como
// qualquer outra (o bundle é legível), e esconder o caminho não protege nada.
exports.adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Não autorizado.' });

  if (req.user.role !== 'admin') {
    // 404 em vez de 403: não confirma a existência da área para quem sonda.
    return res.status(404).json({ message: 'Recurso não encontrado.' });
  }
  next();
};

// Leitura da área de equipe: admin ou TI. O TI enxerga usuários e conteúdo
// para dar suporte, mas alterar cargos continua exclusivo do admin — senão
// um TI comprometido se autopromoveria.
exports.staffOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Não autorizado.' });

  if (req.user.role !== 'admin' && req.user.role !== 'ti') {
    return res.status(404).json({ message: 'Recurso não encontrado.' });
  }
  next();
};
