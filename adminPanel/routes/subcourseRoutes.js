const express = require('express');
const router = express.Router();
const { createSubcourse, getAllSubcourses, updateSubcourse, deleteSubcourse ,searchSubcourses,getSubcoursesByCourseId,addRecordedLessons,updateRecordedLessons,getRecordedLessons} = require('../controllers/course/subcourseController');
const { verifyAdmin } = require('../../middlewares/authMiddleware');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });
const uploadFields = upload.fields([
    { name: 'certificateUrl', maxCount: 1 },
    { name: 'introVideoUrl', maxCount: 1 }
]);

// Routes
router.post('/add-subcourse', verifyAdmin, uploadFields, createSubcourse);
router.get('/get-all-subcourses', verifyAdmin, getAllSubcourses);
router.put('/update-subcourse/:id', verifyAdmin, uploadFields, updateSubcourse);
router.delete("/delete-subcourse/:id", verifyAdmin, deleteSubcourse);
router.get("/search-subcourse",verifyAdmin,searchSubcourses);

router.get("/get-subCoursesById/:courseId",verifyAdmin,getSubcoursesByCourseId)

router.put('/update-recorded-lessons/:id', verifyAdmin,updateRecordedLessons);
router.post('/add-recorded-lessons/:id', verifyAdmin,addRecordedLessons);
router.get('/get-recorded-lessons/:id',verifyAdmin, getRecordedLessons);
module.exports = router;