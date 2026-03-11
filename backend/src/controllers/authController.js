const jwt  = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Preencha todos os campos.' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email já cadastrado.' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed });
    res.status(201).json({ token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email, dailyGoal: user.dailyGoal } });
  } catch (e) { res.status(500).json({ message: 'Erro ao registrar.' }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Email ou senha incorretos.' });
    res.json({ token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email, dailyGoal: user.dailyGoal } });
  } catch (e) { res.status(500).json({ message: 'Erro ao fazer login.' }); }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ id: user._id, name: user.name, email: user.email, dailyGoal: user.dailyGoal });
  } catch (e) { res.status(500).json({ message: 'Erro ao buscar usuário.' }); }
};

// PATCH /api/auth/me — atualiza dailyGoal (e futuros campos de perfil)
exports.updateMe = async (req, res) => {
  try {
    const { dailyGoal } = req.body;
    const user = await User.findById(req.user.id);
    if (dailyGoal !== undefined) user.dailyGoal = Math.max(0, parseInt(dailyGoal) || 0);
    await user.save();
    res.json({ id: user._id, name: user.name, email: user.email, dailyGoal: user.dailyGoal });
  } catch (e) { res.status(500).json({ message: 'Erro ao atualizar perfil.' }); }
};