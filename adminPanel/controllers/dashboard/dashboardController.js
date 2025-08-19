const mongoose = require('mongoose');
const Course = require("../../../course/models/course");
const User = require("../../../userPanel/models/Auth/Auth");
const { apiResponse } = require('../../../utils/apiResponse'); 
const UsermainCourse = require("../../../userPanel/models/UserCourse/usermainCourse");

exports.getStats = async (req, res) => {
  try {
    // Count total courses
    const totalCourses = await Course.countDocuments();
    
    // Count users with verified numbers
    const verifiedUsers = await User.countDocuments({ isNumberVerified: true });
    
    return apiResponse(res, {
      success: true,
      message: "Statistics fetched successfully",
      data: {
        totalCourses,
        verifiedUsers
      },
      statusCode: 200
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "Error fetching statistics",
      data: null,
      statusCode: 500
    });
  }
};


exports.getRecentCourses = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // Default to 10 courses if no limit specified
    
    const recentCourses = await Course
      .find()
      .select('courseName CoverImageUrl createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    
    return apiResponse(res, {
      success: true,
      message: "Recent courses fetched successfully",
      data: recentCourses,
      statusCode: 200
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: "Error fetching recent courses",
      data: null,
      statusCode: 500
    });
  }
};


exports.getMainCourseStatusCounts = async (req, res) => {
  try {
    // Aggregate counts for each status
    const statusCounts = await UsermainCourse.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Initialize counts for all possible statuses
    const result = {
      coursePending: 0,
      certifiedLearner: 0,
      courseCompleted: 0
    };

    // Map aggregated counts to result object
    statusCounts.forEach(item => {
      if (item.status === 'Course Pending') {
        result.coursePending = item.count;
      } else if (item.status === 'Certified Learner') {
        result.certifiedLearner = item.count;
      } else if (item.status === 'Course Completed') {
        result.courseCompleted = item.count;
      }
    });

    return apiResponse(res, {
      success: true,
      message: 'Main course status counts retrieved successfully',
      data: result,
      statusCode: 200
    });
  } catch (error) {
    console.error('Error fetching main course status counts:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error fetching main course status counts',
      data: null,
      statusCode: 500
    });
  }
};