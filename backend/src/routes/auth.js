const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  register, login, getMe, updateMe,
  verifyEmail, forgotPassword, resetPassword, resendVerification,
  changePassword, requestEmailChange, confirmEmailChange,
} = require('../controllers/authController');

router.post('/register',             register);
router.post('/login',                login);
router.get('/me',        protect,    getMe);
router.patch('/me',      protect,    updateMe);
router.get('/verify/:token',         verifyEmail);
router.post('/forgot-password',      forgotPassword);
router.post('/reset-password/:token',resetPassword);
router.post('/resend-verification',  protect, resendVerification);

// Perfil — senha e e-mail. A confirmação da troca é pública porque o link
// chega por e-mail e pode ser aberto em outro navegador, sem sessão ativa.
router.post('/change-password',                protect, changePassword);
router.post('/change-email',                   protect, requestEmailChange);
router.get('/confirm-email-change/:token',              confirmEmailChange);

module.exports = router;