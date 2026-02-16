const express = require('express');
const router = express.Router();
const {getUserPurchasedSubcourses,getUserInProgressSubcourses,getUserCompletedSubcourses} = require('../controllers/userCourses/userCourseController');
const {verifyUser} = require('../../middlewares/authMiddleware'); 

router.get('/purchased-subcourses', verifyUser, getUserPurchasedSubcourses);
router.get('/in-progress-subcourses', verifyUser, getUserInProgressSubcourses);
router.get('/completed-subcourses', verifyUser, getUserCompletedSubcourses);

module.exports = router;