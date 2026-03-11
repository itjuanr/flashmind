const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Verifica se o token foi enviado no formato "Bearer <token>"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Pega apenas a string do token
      token = req.headers.authorization.split(' ')[1];

      // Decodifica e verifica a validade
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Busca o usuário no banco (ignorando a senha) e anexa à requisição
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Tudo certo, pode continuar para a rota!
    } catch (error) {
      res.status(401).json({ message: 'Não autorizado, token inválido ou expirado' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Não autorizado, nenhum token fornecido' });
  }
};

module.exports = { protect };