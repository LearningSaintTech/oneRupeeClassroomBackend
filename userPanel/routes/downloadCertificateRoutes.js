const express = require('express');
const {requestSubcourseCertificatePayment,requestMainCourseCertificatePayment,verifyCertificatePayment,downloadCertificate,downloadMainCourseCertificate,verifyAppleSubcourseCertificate,verifyAppleMainCourseCertificate} = require('../controllers/certificate/downloadCertificateController');
const {verifyUser} = require("../../middlewares/authMiddleware");

const router = express.Router();

router.post('/request-subcourse-certificate-payment', verifyUser, requestSubcourseCertificatePayment);

// Route to request payment for main course certificate
router.post('/request-main-course-certificate-payment', verifyUser, requestMainCourseCertificatePayment);

// Route to verify certificate payment
router.post('/verify-certificate-payment', verifyUser,verifyCertificatePayment);

// Route to download subcourse certificate
router.get('/download-certificate/:subcourseId', verifyUser, downloadCertificate);

// Route to download main course certificate
router.get('/download-main-course-certificate/:courseId', verifyUser, downloadMainCourseCertificate);

// Apple Certificate Verification Routes
router.post('/subcourse/verify-apple', verifyUser, verifyAppleSubcourseCertificate);
router.post('/maincourse/verify-apple', verifyUser, verifyAppleMainCourseCertificate);

module.exports = router;