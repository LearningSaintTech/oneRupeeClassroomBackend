const express = require('express');
const router = express.Router();
const {
    getActivityById,
    getAllActivityImages
} = require('../controllers/activityController/activityController');
const {verifyToken} = require('../../middlewares/authMiddleware'); 



router.get('/get-activity/:id', verifyToken,getActivityById);

router.get('/get-activity-images',verifyToken, getAllActivityImages);

module.exports = router;