const express = require('express');
const {login,verifyOTP,resendOTP} = require('../controllers/auth/authController');

const router = express.Router();

router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

module.exports = router;