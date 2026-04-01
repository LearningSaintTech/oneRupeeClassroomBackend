const express = require('express');
const {
  register,
  login,
  verifyOTP,
  resendOTP,
  refreshTokenHandler,
  logoutHandler
} = require('../controllers/verifyEmail/AuthUserController');

const router = express.Router();

// Email-based auth for user panel
router.post('/register/email', register);
router.post('/login/email', login);
router.post('/verify-otp/email', verifyOTP);
router.post('/resend-otp/email', resendOTP);
router.post('/refresh-token', refreshTokenHandler);
router.post("/logout",logoutHandler)

module.exports = router;

