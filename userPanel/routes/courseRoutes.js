const express = require('express');
const {getAllSubcourses,getPopularCourses,getNewestCourses,getSubcourseById,getLessonById,getAllCourses,getUserPurchasedSubcourses,getEnrolledUsersBySubcourse,getSubcoursesByCourseId,progressBanner,getSubcourseNameAndCertDesc,getCourseNameAndDesc} = require('../controllers/course/courseController');
const {verifyToken} = require("../../middlewares/authMiddleware");


const router = express.Router();

router.get("/getAll-subcourses",verifyToken,getAllSubcourses)
router.get("/getPopular-subcourses",verifyToken,getPopularCourses)
router.get("/getNewest-subcourses",verifyToken,getNewestCourses)


router.get("/getsubcourseById/:id",verifyToken,getSubcourseById)
router.get("/getLessonById/:id",verifyToken,getLessonById)

router.get("/getAllCourses",verifyToken,getAllCourses)

router.get("/get-purchased-course",verifyToken,getUserPurchasedSubcourses)

router.get("/get-enrolled-students/:id",verifyToken,getEnrolledUsersBySubcourse)


router.get("/getALLSubcoursesbyId/:courseId",verifyToken,getSubcoursesByCourseId)


router.get("/homePage-banner",verifyToken,progressBanner)

router.get("/get-certificateDesc/:subcourseId",verifyToken,getSubcourseNameAndCertDesc)


router.get("/get-CoursecertificateDesc/:courseId",verifyToken,getCourseNameAndDesc)




module.exports = router;