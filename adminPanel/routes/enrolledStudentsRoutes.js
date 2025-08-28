const express = require('express');
const router = express.Router();
const {getUsersWithCourses,getMonthlyUserPurchaseCounts } = require('../controllers/studentsEnrolled/totalUsers');
const { verifyToken } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-enrolledStudents', verifyToken, getUsersWithCourses);
router.get("/get-monthlyUsers",verifyToken,getMonthlyUserPurchaseCounts)



module.exports = router;