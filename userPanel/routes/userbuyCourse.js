const express = require('express');
const {buyCourse} = require('../controllers/UserbuyCourse/userCourseController');
const {verifyToken} = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post('/buy-course', verifyToken,buyCourse);


module.exports = router;