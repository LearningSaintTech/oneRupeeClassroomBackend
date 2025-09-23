const express = require('express');
const router = express.Router();
const { 
  loginWith2Factor, 
  registerWith2Factor, 
  verifyOTPWith2Factor, 
  resendOTPWith2Factor,
  check2FactorStatus
} = require('../controllers/twofactorAuthController');

// 2Factor authentication routes
router.post('/login', loginWith2Factor);
router.post('/register', registerWith2Factor);
router.post('/verify-otp', verifyOTPWith2Factor);
router.post('/resend-otp', resendOTPWith2Factor);
router.get('/status', check2FactorStatus);

module.exports = router;
