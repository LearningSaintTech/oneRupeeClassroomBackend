const express = require('express');
const router = express.Router();
const {getAllSubcourseNameAndAvgRating,searchSubcoursesByKeyword,exportSubcoursesToCsv} = require('../controllers/getAllRatings/ratings');
const { verifyToken } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-ratings', verifyToken, getAllSubcourseNameAndAvgRating);
router.get('/search-ratings', verifyToken,searchSubcoursesByKeyword);
router.get('/export-ratings', verifyToken, exportSubcoursesToCsv);


module.exports = router;