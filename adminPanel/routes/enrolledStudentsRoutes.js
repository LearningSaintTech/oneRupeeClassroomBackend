const express = require('express');
const router = express.Router();
const {getUsersWithCourses,getMonthlyUserPurchaseCounts } = require('../controllers/studentsEnrolled/totalUsers');
const { verifyAdmin } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-enrolledStudents', verifyAdmin, getUsersWithCourses);
router.get("/get-monthlyUsers",verifyAdmin,getMonthlyUserPurchaseCounts)



module.exports = router;