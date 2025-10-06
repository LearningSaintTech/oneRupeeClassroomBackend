const express = require('express');
const router = express.Router();
const {buyRecordedLessons,verifyRecordedLessonsPayment,verifyAppleRecordedLessons} = require('../controllers/recordedLessons/recordedLessons');
const {verifyToken} = require('../../middlewares/authMiddleware'); 

router.post('/purchase-recorded-lessons', verifyToken, buyRecordedLessons);

router.post("/verify-lessons-payment",verifyToken,verifyRecordedLessonsPayment)

// Apple Recorded Lessons Verification Route
router.post('/verify-apple', verifyToken, verifyAppleRecordedLessons);

module.exports = router;