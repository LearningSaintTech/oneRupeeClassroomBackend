const express = require('express');
const {downloadCertificate,downloadMainCourseCertificate} = require('../controllers/certificate/downloadCertificateController');
const {verifyToken} = require("../../middlewares/authMiddleware");



const router = express.Router();

router.get("/download-certificate/:subcourseId",verifyToken,downloadCertificate);

router.get("/download-course-certificate/:courseId",verifyToken,downloadMainCourseCertificate);

module.exports = router;