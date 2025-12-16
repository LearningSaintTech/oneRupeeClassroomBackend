const express = require('express');
const router = express.Router();
const {submitRating,getAllRatings} = require('../controllers/userRating/ratingController');
const {verifyToken,verifyUser} = require('../../middlewares/authMiddleware'); 

router.post('/rate-subcourse', verifyUser, submitRating);

router.get("/getAll-ratings",verifyToken,getAllRatings)

module.exports = router;