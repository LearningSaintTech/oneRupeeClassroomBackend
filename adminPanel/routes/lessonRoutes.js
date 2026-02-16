const express = require('express');
const router = express.Router();
const { createLesson, getAllLessons, updateLesson,deleteLesson,searchLessons ,getLessonsBySubcourseId} = require('../controllers/course/lessonController');
const { verifyAdmin } = require('../../middlewares/authMiddleware');
const multer = require('multer');

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });
const uploadFields = upload.fields([
    { name: 'introVideoUrl', maxCount: 1 }
]);

// Routes
router.post('/add-lesson', verifyAdmin, uploadFields, createLesson);
router.get('/get-all-lesson', verifyAdmin, getAllLessons);
router.put('/update-lesson/:id', verifyAdmin, uploadFields, updateLesson);
router.delete('/delete-lesson/:id', verifyAdmin, deleteLesson);
router.get("/search-lesson",verifyAdmin,searchLessons);

router.get("/get-allLessonsById/:subcourseId",verifyAdmin,getLessonsBySubcourseId)

module.exports = router;