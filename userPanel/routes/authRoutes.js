const express = require('express');
const { register, login, verifyOTP, resendOTP, firebaseRegister,
    firebaseLogin,
    firebaseVerifyOTP,
    firebaseResendOTP, } = require('../controllers/auth/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);


router.post('/firebase/register', firebaseRegister);
router.post('/firebase/login', firebaseLogin);
router.post('/firebase/verify-otp', firebaseVerifyOTP);
router.post('/firebase/resend-otp', firebaseResendOTP);

module.exports = router;