const mongoose = require('mongoose');
const User = require('../../../userPanel/models/Auth/Auth');
const UsermainCourse = require('../../../userPanel/models/UserCourse/usermainCourse');
// const UserProfile = require('../models/UserProfile');
const { apiResponse } = require('../../../utils/apiResponse');
const {exportToCsv} = require("../../../utils/exportToCsv");

exports.getPurchasedMainCourseUsers = async (req, res) => {
  try {
    // Get pagination parameters from query (default to page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Aggregate data from UsermainCourse, User, UserProfile, and Course with pagination
    const purchasedUsers = await UsermainCourse.aggregate([
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
          profileImageUrl: '$profile.profileImageUrl',
          status: '$status'
        }
      }
    ]);

    // Get total count for pagination metadata
    const totalUsers = await UsermainCourse.countDocuments();

    // Handle case where no purchased users are found
    if (!purchasedUsers.length) {
      return apiResponse(res, {
        success: true,
        message: 'No users found who purchased main courses',
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
    const formattedResult = purchasedUsers.map((item, index) => ({
      sno: skip + index + 1, // Adjust sno based on pagination
      name: item.fullName,
      courseName: item.courseName,
      contact: item.mobileNumber,
      profileImageUrl: item.profileImageUrl,
      email: item.email || 'N/A',
      status: item.status
    }));

    return apiResponse(res, {
      success: true,
      message: 'Users who purchased main courses retrieved successfully',
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
    console.error('Error fetching purchased main course users:', error);
    return apiResponse(res, {
      success: false,
      message: `Error fetching users who purchased main courses: ${error.message}`,
      statusCode: 500
    });
  }
};


exports.exportUsersToCsv = async (req, res) => {
  try {
    // Aggregate data from UsermainCourse, User, UserProfile, and Course
    const purchasedUsers = await UsermainCourse.aggregate([
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
        $sort: {
          createdAt: -1 // Sort by purchase date (createdAt) descending
        }
      },
      {
        $project: {
          fullName: '$user.fullName',
          courseName: '$course.courseName',
          mobileNumber: '$user.mobileNumber',
          email: '$profile.email',
          profileImageUrl: '$profile.profileImageUrl',
          status: '$status'
        }
      }
    ]);

    // Add serial number and format data for CSV
    const csvData = purchasedUsers.map((item, index) => ({
      sno: index + 1,
      name: item.fullName,
      courseName: item.courseName,
      contact: item.mobileNumber,
      email: item.email || 'N/A',
      status: item.status
    }));

    // Define CSV columns
    const columns = [
      { key: 'sno', header: 'S.No' },
      { key: 'name', header: 'Name' },
      { key: 'courseName', header: 'Course Name' },
      { key: 'contact', header: 'Contact' },
      { key: 'email', header: 'Email' },
      { key: 'profileImageUrl', header: 'Profile Image URL' },
      { key: 'status', header: 'Status' }
    ];

    // Export to CSV using the provided utility
    return exportToCsv(res, csvData, columns, 'purchased_main_courses.csv');
  } catch (error) {
    console.error('Error exporting purchased main course users to CSV:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error exporting users to CSV',
      data: null,
      statusCode: 500
    });
  }
};


exports.searchUsers = async (req, res) => {
  try {
    const { search } = req.query;

    // Validate search query
    if (!search || typeof search !== 'string') {
      return apiResponse(res, {
        success: false,
        message: 'Search query is required and must be a string',
        data: null,
        statusCode: 400
      });
    }

    // Create search regex for case-insensitive partial matching
    const searchRegex = new RegExp(search.trim(), 'i');

    // Aggregate data with search filter
    const purchasedUsers = await UsermainCourse.aggregate([
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
          $or: [
            { 'user.fullName': searchRegex },
            { 'course.name': searchRegex },
            { 'user.mobileNumber': searchRegex },
            { 'profile.email': searchRegex },
            { status: searchRegex }
          ]
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
          courseName: '$course.name', // Assuming course schema has a 'name' field
          mobileNumber: '$user.mobileNumber',
          email: '$profile.email',
          courseName:"$course.courseName",
          profileImageUrl: '$profile.profileImageUrl',
          status: '$status'
        }
      }
    ]);

    // Add serial number to each record
    const formattedResult = purchasedUsers.map((item, index) => ({
      sno: index + 1,
      name: item.fullName,
      courseName: item.courseName,
      contact: item.mobileNumber,
      email: item.email || 'N/A',
      profileImageUrl: item.profileImageUrl || 'N/A',
      status: item.status,
      courseName:item.courseName
    }));

    return apiResponse(res, {
      success: true,
      message: `Found ${formattedResult.length} users matching search query`,
      data: formattedResult,
      statusCode: 200
    });
  } catch (error) {
    console.error('Error searching purchased main course users:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error searching users who purchased main courses',
      data: null,
      statusCode: 500
    });
  }
};


exports.getUsersNoSubcoursePurchase = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get users with no subcourse purchase using aggregate to include profile info
    const usersNoPurchase = await User.aggregate([
      {
        $match: { purchasedsubCourses: { $size: 0 } }
      },
      {
        $lookup: {
          from: 'userprofiles',
          localField: '_id',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $sort: { createdAt: -1 }
      },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          fullName: 1,
          mobileNumber: 1,
          email: '$profile.email',
          profileImageUrl: '$profile.profileImageUrl'
        }
      }
    ]);

    // Get total count
    const totalUsersNoPurchase = await User.countDocuments({ purchasedsubCourses: { $size: 0 } });

    return apiResponse(res, {
      success: true,
      message: 'Users with no subcourse purchased retrieved successfully',
      data: {
        users: usersNoPurchase.map((item, index) => ({
          sno: skip + index + 1,
          name: item.fullName,
          phone: item.mobileNumber,
          email: item.email || 'N/A',
          profileImageUrl: item.profileImageUrl || 'N/A'
        })),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsersNoPurchase / limit),
          totalUsers: totalUsersNoPurchase,
          limit
        }
      },
      statusCode: 200
    });
  } catch (error) {
    console.error('Error fetching users with no subcourse purchase:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error fetching no-purchase user list',
      statusCode: 500
    });
  }
};