const express = require('express');
const router = express.Router();
const {buyRecordedLessons,verifyRecordedLessonsPayment,verifyAppleRecordedLessons} = require('../controllers/recordedLessons/recordedLessons');
const {verifyUser} = require('../../middlewares/authMiddleware'); 

router.post('/purchase-recorded-lessons', verifyUser, buyRecordedLessons);

router.post("/verify-lessons-payment",verifyUser,verifyRecordedLessonsPayment)

// Apple Recorded Lessons Verification Route
router.post('/verify-apple', verifyUser, verifyAppleRecordedLessons);

module.exports = router;