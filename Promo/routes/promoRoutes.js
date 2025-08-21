const express = require('express');
const router = express.Router();
const {uploadPromo,getAllPromos,deletePromo} = require('../controllers/promoController');
const {verifyToken} = require("../../middlewares/authMiddleware")
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Route to upload a promo image
router.post('/upload-promo', verifyToken,upload.single('promo'), uploadPromo);

// Route to get all promos
router.get('/get-promo',verifyToken, getAllPromos);

//delete-promo
router.delete("/delete-promo/:promoId",verifyToken,deletePromo)

module.exports = router;