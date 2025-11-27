const express = require('express');
const router = express.Router();
const {
    getActivityById,
    getAllActivityImages
} = require('../controllers/activityController/activityController');




router.get('/get-activity/:id', getActivityById);

router.get('/get-activity-images', getAllActivityImages);

module.exports = router;