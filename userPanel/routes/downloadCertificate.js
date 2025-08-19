const express = require('express');
const {downloadCertificate} = require('../controllers/downloadCertificates/downloadCertificateController');
const {verifyToken} = require("../../middlewares/authMiddleware");



const router = express.Router();

router.get("/download-certificate",verifyToken,downloadCertificate);

module.exports = router;