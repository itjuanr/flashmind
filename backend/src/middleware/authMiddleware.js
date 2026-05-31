const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Não autorizado. Faça login.' });

    const token = authHeader.split(' ')[1];
    if (!token)
      return res.status(401).json({ message: 'Token não fornecido.' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError')
        return res.status(401).json({ message: 'Sessão expirada. Faça login novamente.' });
      return res.status(401).json({ message: 'Token inválido.' });
    }

    // Busca o usuário — garante que ainda existe no banco
    const user = await User.findById(decoded.id).select('_id name email isVerified').lean();
    if (!user)
      return res.status(401).json({ message: 'Usuário não encontrado.' });

    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ message: 'Não autorizado.' });
  }
};