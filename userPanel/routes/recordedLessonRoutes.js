const express = require('express');
const router = express.Router();
const {buyRecordedLessons,verifyRecordedLessonsPayment} = require('../controllers/recordedLessons/recordedLessons');
const {verifyToken} = require('../../middlewares/authMiddleware'); 

router.post('/purchase-recorded-lessons', verifyToken, buyRecordedLessons);

router.post("/verify-lessons-payment",verifyToken,verifyRecordedLessonsPayment)

module.exports = router;