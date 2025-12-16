const express = require('express');
const router = express.Router();
const {updateAdminProfile,getAdminProfileDetails } = require('../controllers/profile/profileController');
const { verifyAdmin } = require('../../middlewares/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });





// Routes
router.put('/update-profile', verifyAdmin, upload.single('profileImageUrl'),updateAdminProfile);
router.get('/get-profile', verifyAdmin, getAdminProfileDetails);


module.exports = router;