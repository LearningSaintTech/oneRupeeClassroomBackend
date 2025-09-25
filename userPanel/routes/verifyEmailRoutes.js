const express = require('express');
const router = express.Router();
const {sendOTPEmail, verifyOTP,resendOTP } = require('../controllers/verifyEmail/verifyEmailController');
const {verifyToken} = require('../../middlewares/authMiddleware'); 

router.post('/send-emailotp', verifyToken, sendOTPEmail);
router.post('/verify-emailOtp', verifyToken, verifyOTP);
router.post('/resend-emailOtp', verifyToken, resendOTP);

module.exports = router;