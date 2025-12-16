const express = require('express');
const router = express.Router();
const {handleMarkLessonCompleted} = require('../controllers/markCompleted/markCompletedController');
const {verifyUser} = require('../../middlewares/authMiddleware'); 

router.post('/lessons/mark-completed', verifyUser, handleMarkLessonCompleted);

module.exports = router;