const express = require('express');
const router = express.Router();
const {uploadTemplate } = require('../controllers/TemplateUpload/certificateTemplateController');
const { verifyAdmin } = require('../../middlewares/authMiddleware');


// Routes
router.post('/upload-certificateTemplate', verifyAdmin, uploadTemplate);


module.exports = router;