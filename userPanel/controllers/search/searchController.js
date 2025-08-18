const mongoose = require('mongoose');
const Subcourse = require("../../../course/models/subcourse");
const { apiResponse } = require('../../../utils/apiResponse'); 

// Search subcourses by name
exports.searchSubcourses = async (req, res) => {
  try {
    const { name } = req.query;

    // Validate input
    if (!name || typeof name !== 'string') {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse name is required and must be a string',
        statusCode: 400
      });
    }

    // Search subcourses with case-insensitive partial match
    const subcourses = await Subcourse.find({
      subcourseName: { $regex: name, $options: 'i' }
    }).select('subcourseName thumbnailImageUrl avgRating totalLessons');

    // Format the response data
    const formattedSubcourses = subcourses.map(subcourse => ({
      subcourseId: subcourse._id,
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl || null,
      avgRating: subcourse.avgRating,
      totalLessons: subcourse.totalLessons
    }));

    return apiResponse(res, {
      message: 'Subcourses retrieved successfully',
      data: formattedSubcourses
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error retrieving subcourses: ' + error.message,
      statusCode: 500
    });
  }
};