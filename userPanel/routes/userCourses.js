const express = require('express');
const router = express.Router();
const {getUserPurchasedSubcourses,getUserInProgressSubcourses,getUserCompletedSubcourses} = require('../controllers/userCourses/usrCourseController');
const {verifyToken} = require('../../middlewares/authMiddleware'); 

router.get('/purchased-subcourses', verifyToken, getUserPurchasedSubcourses);
router.get('/in-progress-subcourses', verifyToken, getUserInProgressSubcourses);
router.get('/completed-subcourses', verifyToken, getUserCompletedSubcourses);

module.exports = router;