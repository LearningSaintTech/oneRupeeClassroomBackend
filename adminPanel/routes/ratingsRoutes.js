const express = require('express');
const router = express.Router();
const {getAllSubcourseNameAndAvgRating,searchSubcoursesByKeyword,exportSubcoursesToCsv} = require('../controllers/getAllRatings/ratingsController');
const { verifyAdmin } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-ratings', verifyAdmin, getAllSubcourseNameAndAvgRating);
router.get('/search-ratings', verifyAdmin,searchSubcoursesByKeyword);
router.get('/export-ratings', verifyAdmin, exportSubcoursesToCsv);


module.exports = router;