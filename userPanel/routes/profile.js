const express = require('express');
const {createUserProfile,updateUserProfile,getUserProfile,getUserbasicInfo,getProfileInfo} = require('../controllers/profile/profileController');
const {verifyToken} = require("../../middlewares/authMiddleware");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

const {imageUploadController} = require("../../uploloadImages");

// router.post('/create-profile', verifyToken,upload.single('profileImageUrl'),createUserProfile);
router.put('/update-profile',verifyToken,upload.single('profileImageUrl'), updateUserProfile);
router.get('/get-profile', verifyToken,getUserProfile);
router.get("/getUser-basicInfo",verifyToken,getUserbasicInfo)
router.get("/getProfileInfo",verifyToken,getProfileInfo)


router.post("/upload-image",upload.single('logo'),imageUploadController)

module.exports = router;