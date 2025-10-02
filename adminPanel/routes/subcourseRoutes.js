const express = require('express');
const router = express.Router();
const { createSubcourse, getAllSubcourses, updateSubcourse, deleteSubcourse ,searchSubcourses,getSubcoursesByCourseId,addRecordedLessons,updateRecordedLessons,getRecordedLessons} = require('../controllers/course/subcourseController');
const { verifyToken } = require('../../middlewares/authMiddleware');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });
const uploadFields = upload.fields([
    { name: 'certificateUrl', maxCount: 1 },
    { name: 'introVideoUrl', maxCount: 1 }
]);

// Routes
router.post('/add-subcourse', verifyToken, uploadFields, createSubcourse);
router.get('/get-all-subcourses', verifyToken, getAllSubcourses);
router.put('/update-subcourse/:id', verifyToken, uploadFields, updateSubcourse);
router.delete("/delete-subcourse/:id", verifyToken, deleteSubcourse);
router.get("/search-subcourse",verifyToken,searchSubcourses);

router.get("/get-subCoursesById/:courseId",verifyToken,getSubcoursesByCourseId)

router.put('/update-recorded-lessons/:id', verifyToken,updateRecordedLessons);
router.post('/add-recorded-lessons/:id', verifyToken,addRecordedLessons);
router.get('/get-recorded-lessons/:id',verifyToken, getRecordedLessons);
module.exports = router;