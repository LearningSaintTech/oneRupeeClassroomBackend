const express = require('express');
const {getAllSubcourses,getPopularCourses,getNewestCourses,getSubcourseById,getLessonById,getAllCourses} = require('../controllers/course/courseController');
const {verifyToken} = require("../../middlewares/authMiddleware");


const router = express.Router();

router.get("/getAll-subcourses",verifyToken,getAllSubcourses)
router.get("/getPopular-subcourses",verifyToken,getPopularCourses)
router.get("/getNewest-subcourses",verifyToken,getNewestCourses)


router.get("/getsubcourseById/:id",verifyToken,getSubcourseById)
router.get("/getLessonById/:id",verifyToken,getLessonById)

router.get("/getAllCourses",verifyToken,getAllCourses)



module.exports = router;