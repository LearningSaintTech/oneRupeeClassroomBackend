const express = require('express');
const router = express.Router();
const { requestInternshipLetter, updatePaymentStatus } = require('../controllers/InternshipLetter/internshipLetter');
const {verifyToken} = require('../../middlewares/authMiddleware');

// Routes
router.post('/request-InternshipLetter', verifyToken, requestInternshipLetter);
router.post('/verify-payment', verifyToken, updatePaymentStatus);

module.exports = router;