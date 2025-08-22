const express = require('express');
const router = express.Router();
const { createLesson, getAllLessons, updateLesson,deleteLesson,searchLessons ,getLessonsBySubcourseId} = require('../controllers/course/lessonController');
const { verifyToken } = require('../../middlewares/authMiddleware');
const multer = require('multer');

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });
const uploadFields = upload.fields([
    { name: 'introVideoUrl', maxCount: 1 }
]);

// Routes
router.post('/add-lesson', verifyToken, uploadFields, createLesson);
router.get('/get-all-lesson', verifyToken, getAllLessons);
router.put('/update-lesson/:id', verifyToken, uploadFields, updateLesson);
router.delete('/delete-lesson/:id', verifyToken, deleteLesson);
router.get("/search-lesson",verifyToken,searchLessons);

router.get("/get-allLessonsById/:subcourseId",verifyToken,getLessonsBySubcourseId)

module.exports = router;