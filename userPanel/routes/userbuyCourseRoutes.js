const express = require('express');
const {buyCourse,verifyPayment,verifyApplePurchase,checkPurchase} = require('../controllers/UserbuyCourse/userCourseController');
const {verifyUser} = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post('/buy-course', verifyUser,buyCourse);
router.post('/verify-payment',verifyUser,verifyPayment);
router.post('/verify-apple-payment',verifyUser,verifyApplePurchase);
router.post('/check-apple-purchase',verifyUser,checkPurchase)


module.exports = router;