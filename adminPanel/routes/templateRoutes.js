const express = require('express');
const router = express.Router();
const {uploadTemplate } = require('../controllers/TemplateUpload/certificateTemplateController');
const { verifyToken } = require('../../middlewares/authMiddleware');


// Routes
router.post('/upload-certificateTemplate', verifyToken, uploadTemplate);


module.exports = router;