const express = require('express');
const router = express.Router();
const { createCourse, getAllCourses, updateCourse,deleteCourse,searchCourses } = require('../controllers/course/courseController');
const { verifyAdmin  } = require('../../middlewares/authMiddleware');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });

// Routes
router.post('/add-course', verifyAdmin, upload.single('coverImage'), createCourse);
router.get('/get-all-courses', verifyAdmin , getAllCourses);
router.put('/update-course/:id', verifyAdmin, upload.single('coverImage'), updateCourse);
router.delete('/delete-course/:id', verifyAdmin,deleteCourse);
router.get('/search-course', verifyAdmin,searchCourses);


module.exports = router;