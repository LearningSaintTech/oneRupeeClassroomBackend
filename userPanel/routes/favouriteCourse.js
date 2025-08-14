const express = require('express');
const {toggleFavourite,getFavouriteCourses} = require('../controllers/FavouriteCourse/favouriteCourseController');
const {verifyToken} = require("../../middlewares/authMiddleware");



const router = express.Router();

router.post("/add-favouriteCourse",verifyToken,toggleFavourite);
router.get("/get-favouriteCourses",verifyToken,getFavouriteCourses)

module.exports = router;