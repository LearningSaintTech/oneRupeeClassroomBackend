const mongoose = require('mongoose');
const Subcourse = require("../../../course/models/subcourse");
const User = require("../../models/Auth/Auth");
const { apiResponse } = require('../../../utils/apiResponse'); 

// Search subcourses by name
exports.searchSubcourses = async (req, res) => {
  try {
    const { name } = req.query;
    const userId = req.userId; // Assuming user ID is available from JWT middleware
    console.log(`Searching subcourses for name: ${name}, userId: ${userId}`);

    // Validate input
    if (!name || typeof name !== 'string') {
      console.log('Invalid subcourse name provided');
      return apiResponse(res, {
        success: false,
        message: 'Subcourse name is required and must be a string',
        statusCode: 400,
      });
    }

    // Fetch user's purchased subcourses
    const user = await User.findById(userId).select('purchasedsubCourses');
    if (!user) {
      console.log(`User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }
    const purchasedSubcourseIds = user.purchasedsubCourses || [];

    // Search subcourses with case-insensitive partial match, excluding purchased ones
    const subcourses = await Subcourse.find({
      subcourseName: { $regex: name, $options: 'i' },
      _id: { $nin: purchasedSubcourseIds }, // Exclude purchased subcourses
    }).select('subcourseName thumbnailImageUrl avgRating totalLessons');

    // Handle case where no subcourses are found
    if (!subcourses.length) {
      console.log(`No unpurchased subcourses found for name: ${name}`);
      return apiResponse(res, {
        success: false,
        message: 'No unpurchased subcourses found matching the search criteria',
        statusCode: 404,
      });
    }

    // Format the response data
    const formattedSubcourses = subcourses.map((subcourse) => ({
      subcourseId: subcourse._id,
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl || null,
      avgRating: subcourse.avgRating,
      totalLessons: subcourse.totalLessons,
    }));

    return apiResponse(res, {
      success: true,
      message: 'Unpurchased subcourses retrieved successfully',
      data: formattedSubcourses,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error retrieving subcourses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to retrieve subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};