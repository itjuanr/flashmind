const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  register, login, getMe, updateMe,
  verifyEmail, forgotPassword, resetPassword, resendVerification,
} = require('../controllers/authController');

router.post('/register',             register);
router.post('/login',                login);
router.get('/me',        protect,    getMe);
router.patch('/me',      protect,    updateMe);
router.get('/verify/:token',         verifyEmail);
router.post('/forgot-password',      forgotPassword);
router.post('/reset-password/:token',resetPassword);
router.post('/resend-verification',  protect, resendVerification);

module.exports = router;