const express = require('express');
const router = express.Router();
const { requestInternshipLetter, updatePaymentStatus,checkInternshipStatus,verifyAppleInternshipLetter } = require('../controllers/InternshipLetter/internshipLetterController');
const {verifyUser} = require('../../middlewares/authMiddleware');

// Routes
router.post('/request-InternshipLetter', verifyUser, requestInternshipLetter);
router.post('/verify-payment', verifyUser, updatePaymentStatus);

router.get('/check-internshipStatus/:subcourseId', verifyUser, checkInternshipStatus);


router.post('/verify-apple', verifyUser, verifyAppleInternshipLetter);

module.exports = router;