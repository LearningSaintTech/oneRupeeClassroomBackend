const express = require('express');
const {buyCourse,verifyPayment,verifyApplePurchase,checkPurchase} = require('../controllers/UserbuyCourse/userCourseController');
const {verifyToken} = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post('/buy-course', verifyToken,buyCourse);
router.post('/verify-payment',verifyToken,verifyPayment);
router.post('/verify-apple-payment',verifyToken,verifyApplePurchase);
router.post('/check-apple-purchase',verifyToken,checkPurchase)


module.exports = router;