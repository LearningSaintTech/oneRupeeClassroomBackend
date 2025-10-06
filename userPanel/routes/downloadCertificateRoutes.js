const express = require('express');
const {requestSubcourseCertificatePayment,requestMainCourseCertificatePayment,verifyCertificatePayment,downloadCertificate,downloadMainCourseCertificate,verifyAppleSubcourseCertificate,verifyAppleMainCourseCertificate} = require('../controllers/certificate/downloadCertificateController');
const {verifyToken} = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post('/request-subcourse-certificate-payment', verifyToken, requestSubcourseCertificatePayment);

// Route to request payment for main course certificate
router.post('/request-main-course-certificate-payment', verifyToken, requestMainCourseCertificatePayment);

// Route to verify certificate payment
router.post('/verify-certificate-payment', verifyToken,verifyCertificatePayment);

// Route to download subcourse certificate
router.get('/download-certificate/:subcourseId', verifyToken, downloadCertificate);

// Route to download main course certificate
router.get('/download-main-course-certificate/:courseId', verifyToken, downloadMainCourseCertificate);

// Apple Certificate Verification Routes
router.post('/subcourse/verify-apple', verifyToken, verifyAppleSubcourseCertificate);
router.post('/maincourse/verify-apple', verifyToken, verifyAppleMainCourseCertificate);

module.exports = router;