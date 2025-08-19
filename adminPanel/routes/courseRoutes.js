const express = require('express');
const router = express.Router();
const { createCourse, getAllCourses, updateCourse,deleteCourse,searchCourses } = require('../controllers/course/courseController');
const { verifyToken } = require('../../middlewares/authMiddleware');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });

// Routes
router.post('/add-course', verifyToken, upload.single('coverImage'), createCourse);
router.get('/get-all-courses', verifyToken, getAllCourses);
router.put('/update-course/:id', verifyToken, upload.single('coverImage'), updateCourse);
router.delete('/delete-course/:id', verifyToken,deleteCourse);
router.get('/search-course', verifyToken,searchCourses);

module.exports = router;