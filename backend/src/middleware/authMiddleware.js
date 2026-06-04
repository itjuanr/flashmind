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
    };

    next();
  } catch (error) {
    console.error('Erro no AuthMiddleware:', error.message);
    res.status(401).json({ message: 'Sessão expirada ou inválida.' });
  }
};
