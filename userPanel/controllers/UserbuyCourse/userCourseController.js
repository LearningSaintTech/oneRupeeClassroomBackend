const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth'); 
const UserCourse = require('../../models/UserCourse/userCourse'); 
const Subcourse = require("../../../course/models/subcourse");
const { apiResponse } = require('../../../utils/apiResponse'); 
const UsermainCourse = require("../../models/UserCourse/usermainCourse");

// Buy course API
exports.buyCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { subcourseId } = req.body;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if subcourse exists
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Check if subcourse is already purchased
    if (user.purchasedsubCourses.includes(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse already purchased',
        statusCode: 400,
      });
    }

    // Check if usermainCourse exists for the user and main course
    let usermainCourse = await UsermainCourse.findOne({
      userId,
      courseId: subcourse.courseId,
    });

    // If usermainCourse doesn't exist, create a new one
    if (!usermainCourse) {
      usermainCourse = new UsermainCourse({
        userId,
        courseId: subcourse.courseId,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      });
      await usermainCourse.save();
    }

    // Create or update userCourse entry with paymentStatus set to true
    let userCourse = await UserCourse.findOne({ userId, subcourseId });

    if (!userCourse) {
      userCourse = new UserCourse({
        userId,
        courseId: subcourse.courseId,
        subcourseId,
        paymentStatus: true,
        isCompleted: false,
        progress: '0%',
      });
    } else {
      userCourse.paymentStatus = true;
    }

    await userCourse.save();

    // Add subcourse to user's purchasedsubCourses array
    user.purchasedsubCourses.push(subcourseId);
    await user.save();

    // Increment totalStudentsEnrolled in subcourse
    subcourse.totalStudentsEnrolled += 1;
    await subcourse.save();

    return apiResponse(res, {
      success: true,
      message: 'Subcourse purchased successfully',
      data: {
        userCourse,
        usermainCourse, // Include usermainCourse in response
        purchasedsubCourses: user.purchasedsubCourses,
        totalStudentsEnrolled: subcourse.totalStudentsEnrolled,
      },
      statusCode: 200,
    });

  } catch (error) {
    console.error('Error in buyCourse API:', error);
    return apiResponse(res, {
      success: false,
      message: 'Internal server error',
      statusCode: 500,
    });
  }
};
