const express = require('express');
const {buyCourse,verifyPayment} = require('../controllers/UserbuyCourse/userCourseController');
const {verifyToken} = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post('/buy-course', verifyToken,buyCourse);
router.post('/verify-payment',verifyToken,verifyPayment)


module.exports = router;