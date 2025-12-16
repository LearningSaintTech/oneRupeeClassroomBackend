const express = require('express');
const {createUserProfile,updateUserProfile,getUserProfile,getUserbasicInfo,getProfileInfo,deleteUserProfile} = require('../controllers/profile/profileController');
const {verifyUser} = require("../../middlewares/authMiddleware");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

const {imageUploadController} = require("../../other_modules/uploloadImages");

// router.post('/create-profile', verifyToken,upload.single('profileImageUrl'),createUserProfile);
router.put('/update-profile',verifyUser,upload.single('profileImageUrl'), updateUserProfile);
router.get('/get-profile', verifyUser,getUserProfile);
router.get("/getUser-basicInfo",verifyUser,getUserbasicInfo)
router.get("/getProfileInfo",verifyUser,getProfileInfo)

router.delete("/delete-profile",verifyUser,deleteUserProfile)

router.post("/upload-image",upload.single('logo'),imageUploadController)





module.exports = router;