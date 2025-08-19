const express = require('express');
const router = express.Router();
const {saveCertificateTemplate } = require('../controllers/TemplateUpload/certificateTemplateController');
const { verifyToken } = require('../../middlewares/authMiddleware');
const multer = require('multer');


const upload = multer({ storage: multer.memoryStorage() });

// Routes
router.post('/upload-certificateTemplate', verifyToken, upload.single('file'), saveCertificateTemplate);


module.exports = router;