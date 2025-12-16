const express = require('express');
const {toggleFavourite,getFavouriteCourses} = require('../controllers/FavouriteCourse/favouriteCourseController');
const {verifyUser} = require("../../middlewares/authMiddleware");



const router = express.Router();

router.post("/add-favouriteCourse",verifyUser,toggleFavourite);
router.get("/get-favouriteCourses",verifyUser,getFavouriteCourses)

module.exports = router;