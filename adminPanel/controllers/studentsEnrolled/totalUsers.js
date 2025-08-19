const mongoose = require('mongoose');
// const User = require('./models/User');
const UserCourse = require('../../../userPanel/models/UserCourse/userCourse');
// const UserProfile = require('./models/UserProfile');
const { apiResponse } = require('../../../utils/apiResponse');

exports.getUsersWithCourses = async (req, res) => {
  try {
    // Aggregate data from User, UserCourse, and UserProfile
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
      {
        $project: {
          fullName: '$user.fullName',
          courseName: '$course.courseName', // Assuming course schema has a 'name' field
          mobileNumber: '$user.mobileNumber',
          email: '$profile.email',
          profileImageUrl: '$profile.profileImageUrl'
        }
      }
    ]);

    // Add serial number to each record
    const formattedResult = usersWithCourses.map((item, index) => ({
      sno: index + 1,
      name: item.fullName,
      courseName: item.courseName,
      contact: item.mobileNumber,
      email: item.email || 'N/A',
      profileImageUrl: item.profileImageUrl || 'N/A'
    }));

    return apiResponse(res, {
      success: true,
      message: 'Users with purchased courses retrieved successfully',
      data: formattedResult,
      statusCode: 200
    });
  } catch (error) {
    console.error('Error fetching users with courses:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error fetching users with purchased courses',
      data: null,
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