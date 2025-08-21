const express = require('express');
const router = express.Router();
const {getAllSubcourseNameAndAvgRating} = require('../controllers/getAllRatings/ratings');
const { verifyToken } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-ratings', verifyToken, getAllSubcourseNameAndAvgRating);



module.exports = router;