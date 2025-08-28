const express = require('express');
const router = express.Router();
const { uploadInternshipLetter } = require('../controllers/uploadInternshipLetter/uploadInternshipLetterController');
const {verifyToken} = require('../../middlewares/authMiddleware');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });

// Routes
router.post('/upload-internshipLetter', verifyToken, upload.single('internshipLetter'), uploadInternshipLetter);

module.exports = router;