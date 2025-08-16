const express = require('express');
const router = express.Router();
const {handleMarkLessonCompleted} = require('../controllers/markCompleted/markCompletedController');
const {verifyToken} = require('../../middlewares/authMiddleware'); 

router.post('/lessons/mark-completed', verifyToken, handleMarkLessonCompleted);

module.exports = router;