const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createActivity,
  updateActivity,
  getAllActivities,
  getActivityById,
  deleteActivity
} = require('../controllers/activity/activityController');

const {verifyToken} = require("../../middlewares/authMiddleware")

// Multer config: store in memory (for S3 upload)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP allowed'));
    }
  }
});

// Routes
router.post('/post-activities', verifyToken,upload.single('activityImage'), createActivity);

router.put('/update-activities/:id',verifyToken, upload.single('activityImage'), updateActivity);

router.get('/get-activities',verifyToken, getAllActivities);
router.get('/activities/:id',verifyToken, getActivityById);

router.delete('/delete-activities/:id', deleteActivity);

module.exports = router;