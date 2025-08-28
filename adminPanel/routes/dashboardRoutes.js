const express = require('express');
const router = express.Router();
const {getStats,getRecentCourses ,getMainCourseStatusCounts} = require('../controllers/dashboard/dashboardController');
const { verifyToken } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-count', verifyToken, getStats);
router.get('/get-recentCourses', verifyToken, getRecentCourses);
router.get("/get-status-count",verifyToken,getMainCourseStatusCounts)


module.exports = router;