const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth'); 
const Subcourse = require('../../../adminPanel/models/course/subcourse'); 
const UserCourse = require('../../models/UserCourse/userCourse'); 
const { apiResponse } = require('../../../utils/apiResponse'); 

// Get all purchased subcourses for the authenticated user
exports.getUserPurchasedSubcourses = async (req, res) => {
  try {
    const userId = req.userId;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId).select('purchasedsubCourses');
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // If no purchased subcourses, return empty array
    if (!user.purchasedsubCourses || user.purchasedsubCourses.length === 0) {
      return apiResponse(res, {
        success: true,
        message: 'No purchased subcourses found',
        data: {
          subcourses: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalSubcourses: 0,
            limit: parseInt(req.query.limit) || 10,
          },
        },
        statusCode: 200,
      });
    }

    // Get pagination parameters from query (default to page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch purchased subcourses with required fields and pagination
    const subcourses = await Subcourse.find({
      _id: { $in: user.purchasedsubCourses },
    })
      .select('subcourseName thumbnailImageUrl rating totalLessons')
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const totalSubcourses = await Subcourse.countDocuments({
      _id: { $in: user.purchasedsubCourses },
    });

    // Fetch progress from UserCourse for each purchased subcourse
    const userCourses = await UserCourse.find({
      userId,
      subcourseId: { $in: user.purchasedsubCourses },
    }).select('subcourseId progress');

    // Map subcourses to include progress
    const result = subcourses.map(subcourse => {
      const userCourse = userCourses.find(uc => uc.subcourseId.toString() === subcourse._id.toString());
      return {
        subcourseId: subcourse._id,
        subcourseName: subcourse.subcourseName,
        thumbnailImageUrl: subcourse.thumbnailImageUrl,
        rating: subcourse.rating,
        totalLessons: subcourse.totalLessons,
        progress: userCourse ? userCourse.progress : '0%',
      };
    });

    return apiResponse(res, {
      success: true,
      message: 'Purchased subcourses retrieved successfully',
      data: {
        subcourses: result,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSubcourses / limit),
          totalSubcourses,
          limit,
        },
      },
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch purchased subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Get in-progress subcourses for the authenticated user
exports.getUserInProgressSubcourses = async (req, res) => {
  try {
    const userId = req.userId;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId).select('purchasedsubCourses');
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // If no purchased subcourses, return empty array
    if (!user.purchasedsubCourses || user.purchasedsubCourses.length === 0) {
      return apiResponse(res, {
        success: true,
        message: 'No in-progress subcourses found',
        data: {
          subcourses: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalSubcourses: 0,
            limit: parseInt(req.query.limit) || 10,
          },
        },
        statusCode: 200,
      });
    }

    // Get pagination parameters from query (default to page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch UserCourse entries that are not completed
    const userCourses = await UserCourse.find({
      userId,
      subcourseId: { $in: user.purchasedsubCourses },
      isCompleted: false,
    })
      .select('subcourseId progress')
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const totalSubcourses = await UserCourse.countDocuments({
      userId,
      subcourseId: { $in: user.purchasedsubCourses },
      isCompleted: false,
    });

    // If no in-progress subcourses, return empty array
    if (!userCourses || userCourses.length === 0) {
      return apiResponse(res, {
        success: true,
        message: 'No in-progress subcourses found',
        data: {
          subcourses: [],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalSubcourses / limit),
            totalSubcourses,
            limit,
          },
        },
        statusCode: 200,
      });
    }

    // Fetch subcourses with required fields
    const subcourseIds = userCourses.map(uc => uc.subcourseId);
    const subcourses = await Subcourse.find({
      _id: { $in: subcourseIds },
    }).select('subcourseName thumbnailImageUrl rating totalLessons');

    // Map subcourses to include progress
    const result = subcourses.map(subcourse => {
      const userCourse = userCourses.find(uc => uc.subcourseId.toString() === subcourse._id.toString());
      return {
        subcourseId: subcourse._id,
        subcourseName: subcourse.subcourseName,
        thumbnailImageUrl: subcourse.thumbnailImageUrl,
        rating: subcourse.rating,
        totalLessons: subcourse.totalLessons,
        progress: userCourse ? userCourse.progress : '0%',
      };
    });

    return apiResponse(res, {
      success: true,
      message: 'In-progress subcourses retrieved successfully',
      data: {
        subcourses: result,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSubcourses / limit),
          totalSubcourses,
          limit,
        },
      },
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch in-progress subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Get completed subcourses for the authenticated user
exports.getUserCompletedSubcourses = async (req, res) => {
  try {
    const userId = req.userId;

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId).select('purchasedsubCourses');
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // If no purchased subcourses, return empty array
    if (!user.purchasedsubCourses || user.purchasedsubCourses.length === 0) {
      return apiResponse(res, {
        success: true,
        message: 'No completed subcourses found',
        data: {
          subcourses: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalSubcourses: 0,
            limit: parseInt(req.query.limit) || 10,
          },
        },
        statusCode: 200,
      });
    }

    // Get pagination parameters from query (default to page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch UserCourse entries that are completed
    const userCourses = await UserCourse.find({
      userId,
      subcourseId: { $in: user.purchasedsubCourses },
      isCompleted: true,
    })
      .select('subcourseId progress')
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const totalSubcourses = await UserCourse.countDocuments({
      userId,
      subcourseId: { $in: user.purchasedsubCourses },
      isCompleted: true,
    });

    // If no completed subcourses, return empty array
    if (!userCourses || userCourses.length === 0) {
      return apiResponse(res, {
        success: true,
        message: 'No completed subcourses found',
        data: {
          subcourses: [],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalSubcourses / limit),
            totalSubcourses,
            limit,
          },
        },
        statusCode: 200,
      });
    }

    // Fetch subcourses with required fields
    const subcourseIds = userCourses.map(uc => uc.subcourseId);
    const subcourses = await Subcourse.find({
      _id: { $in: subcourseIds },
    }).select('subcourseName thumbnailImageUrl rating totalLessons');

    // Map subcourses to include progress
    const result = subcourses.map(subcourse => {
      const userCourse = userCourses.find(uc => uc.subcourseId.toString() === subcourse._id.toString());
      return {
        subcourseId: subcourse._id,
        subcourseName: subcourse.subcourseName,
        thumbnailImageUrl: subcourse.thumbnailImageUrl,
        rating: subcourse.rating,
        totalLessons: subcourse.totalLessons,
        progress: userCourse ? userCourse.progress : '0%',
      };
    });

    return apiResponse(res, {
      success: true,
      message: 'Completed subcourses retrieved successfully',
      data: {
        subcourses: result,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalSubcourses / limit),
          totalSubcourses,
          limit,
        },
      },
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch completed subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};