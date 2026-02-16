const express = require('express');
const router = express.Router();
const {getStats,getRecentCourses ,getMainCourseStatusCounts} = require('../controllers/dashboard/dashboardController');
const { verifyAdmin } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-count', verifyAdmin, getStats);
router.get('/get-recentCourses', verifyAdmin, getRecentCourses);
router.get("/get-status-count",verifyAdmin,getMainCourseStatusCounts)


module.exports = router;