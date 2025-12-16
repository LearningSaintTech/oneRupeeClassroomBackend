const express = require('express');
const router = express.Router();
const {sendOTPEmail, verifyOTP,resendOTP } = require('../controllers/verifyEmail/verifyEmailController');
const {verifyUser} = require('../../middlewares/authMiddleware'); 

router.post('/send-emailotp', verifyUser, sendOTPEmail);
router.post('/verify-emailOtp', verifyUser, verifyOTP);
router.post('/resend-emailOtp', verifyUser, resendOTP);

module.exports = router;