const express = require('express');
const router = express.Router();
const {updateAdminProfile,getAdminProfileDetails } = require('../controllers/profile/profile');
const { verifyToken } = require('../../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });





// Routes
router.put('/update-profile', verifyToken, upload.single('profileImageUrl'),updateAdminProfile);
router.get('/get-profile', verifyToken, getAdminProfileDetails);


module.exports = router;