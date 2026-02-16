const express = require('express');
const router = express.Router();
const { uploadInternshipLetter } = require('../controllers/uploadInternshipLetter/uploadInternshipLetterController');
const {verifyAdmin} = require('../../middlewares/authMiddleware');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });

// Routes
router.post('/upload-internshipLetter', verifyAdmin, upload.single('internshipLetter'), uploadInternshipLetter);

module.exports = router;