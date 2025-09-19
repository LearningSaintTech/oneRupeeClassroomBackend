const mongoose = require('mongoose');
// const User = require('./models/User');
const UserCourse = require('../../../userPanel/models/UserCourse/userCourse');
// const UserProfile = require('./models/UserProfile');
const { apiResponse } = require('../../../utils/apiResponse');

exports.getUsersWithCourses = async (req, res) => {
  try {
    // Get pagination parameters from query (default to page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Aggregate data from UserCourse, User, Course, and UserProfile with pagination
    const usersWithCourses = await UserCourse.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course'
        }
      },
      { $unwind: '$course' },
      {
        $lookup: {
          from: 'userprofiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          paymentStatus: true // Only include users who have paid
        }
      },
      {
        $sort: {
          createdAt: -1 // Sort by purchase date (createdAt) descending
        }
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          fullName: '$user.fullName',
          courseName: '$course.courseName',
          mobileNumber: '$user.mobileNumber',
          email: '$profile.email',
          profileImageUrl: '$profile.profileImageUrl'
        }
      }
    ]);

    // Get total count for pagination metadata
    const totalUsers = await UserCourse.countDocuments({ paymentStatus: true });

    // Handle case where no users with purchased courses are found
    if (!usersWithCourses.length) {
      return apiResponse(res, {
        success: true,
        message: 'No users with purchased courses found',
        data: {
          users: [],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            limit,
          },
        },
        statusCode: 200,
      });
    }

    // Add serial number to each record
    const formattedResult = usersWithCourses.map((item, index) => ({
      sno: skip + index + 1, // Adjust sno based on pagination
      name: item.fullName,
      courseName: item.courseName,
      contact: item.mobileNumber,
      email: item.email || 'N/A',
      profileImageUrl: item.profileImageUrl || 'N/A'
    }));

    return apiResponse(res, {
      success: true,
      message: 'Users with purchased courses retrieved successfully',
      data: {
        users: formattedResult,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          limit,
        },
      },
      statusCode: 200
    });
  } catch (error) {
    console.error('Error fetching users with courses:', error);
    return apiResponse(res, {
      success: false,
      message: `Error fetching users with purchased courses: ${error.message}`,
      statusCode: 500
    });
  }
};




exports.getMonthlyUserPurchaseCounts = async (req, res) => {
  try {
    const monthlyCounts = await UserCourse.aggregate([
      {
        $match: {
          paymentStatus: true // Only include paid courses
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': -1,
          '_id.month': -1
        }
      },
      {
        $project: {
          year: '$_id.year',
          month: '$_id.month',
          count: 1,
          _id: 0
        }
      }
    ]);

    // Format month names for better readability
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const formattedResult = monthlyCounts.map(item => ({
      year: item.year,
      month: monthNames[item.month - 1], // Convert month number to name
      count: item.count
    }));

    return apiResponse(res, {
      success: true,
      message: 'Monthly user purchase counts retrieved successfully',
      data: formattedResult,
      statusCode: 200
    });
  } catch (error) {
    console.error('Error fetching monthly user purchase counts:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error fetching monthly user purchase counts',
      data: null,
      statusCode: 500
    });
  }
};