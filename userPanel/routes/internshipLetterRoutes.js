const express = require('express');
const router = express.Router();
const { requestInternshipLetter, updatePaymentStatus,checkInternshipStatus } = require('../controllers/InternshipLetter/internshipLetterController');
const {verifyToken} = require('../../middlewares/authMiddleware');

// Routes
router.post('/request-InternshipLetter', verifyToken, requestInternshipLetter);
router.post('/verify-payment', verifyToken, updatePaymentStatus);

router.get('/check-internshipStatus/:courseId', verifyToken, checkInternshipStatus);

module.exports = router;