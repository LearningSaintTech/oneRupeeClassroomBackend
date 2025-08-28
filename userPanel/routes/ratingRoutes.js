const express = require('express');
const router = express.Router();
const {submitRating,getAllRatings} = require('../controllers/userRating/ratingController');
const {verifyToken} = require('../../middlewares/authMiddleware'); 

router.post('/rate-subcourse', verifyToken, submitRating);

router.get("/getAll-ratings",verifyToken,getAllRatings)

module.exports = router;