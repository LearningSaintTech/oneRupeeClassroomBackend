const mongoose = require('mongoose');
const Rating = require("../../models/Rating/rating");
const Subcourse = require("../../../course/models/subcourse");
const { apiResponse } = require('../../../utils/apiResponse');
const UserAuth = require("../../models/Auth/Auth")

// Submit or update rating
exports.submitRating = async (req, res) => {
  try {
    const userId = req.userId;
    const { subcourseId, rating } = req.body;

    // Validate input
    if (!subcourseId || !rating || rating < 1 || rating > 5) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid input data',
        statusCode: 400
      });
    }

    // Check if user exists in UserAuth
    const user = await UserAuth.findById(userId);
    if (!user) {
      console.log("User not found for userId:", userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if rating exists
    let existingRating = await Rating.findOne({ userId, subcourseId });

    if (existingRating) {
      if (existingRating.rating === rating) {
        // Same star clicked → decrease rating by 1
        existingRating.rating = existingRating.rating - 1;

        if (existingRating.rating < 1) {
          // If rating becomes 0, delete the record
          await Rating.deleteOne({ _id: existingRating._id });
        } else {
          await existingRating.save();
        }
      } else {
        // Different star clicked → update to new rating
        existingRating.rating = rating;
        await existingRating.save();
      }
    } else {
      // No rating exists → create new rating
      await Rating.create({ userId, subcourseId, rating });
    }

    // Calculate average rating for the subcourse
    const ratings = await Rating.find({ subcourseId });
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    // Update subcourse with new average rating
    await Subcourse.findByIdAndUpdate(subcourseId, {
      avgRating: parseFloat(avgRating.toFixed(1))
    });

    return apiResponse(res, {
      message: 'Rating submitted successfully',
      data: { avgRating: parseFloat(avgRating.toFixed(1)) }
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error submitting rating: ' + error.message,
      statusCode: 500
    });
  }
};

//get all ratings

exports.getAllRatings = async (req, res) => {
  try {
    const { subcourseId } = req.query;
    console.log("id", subcourseId)
    const userId = req.userId;

    // Validate subcourseId
    if (!subcourseId) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse ID is required',
        statusCode: 400
      });
    }

    
    // Check if user exists in UserAuth
    const user = await UserAuth.findById(userId);
    if (!user) {
      console.log("User not found for userId:", userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }


    // Fetch all ratings for the subcourse with user and profile details
    const ratings = await Rating.aggregate([
      { $match: { subcourseId: new mongoose.Types.ObjectId(subcourseId) } },
      {
        $lookup: {
          from: 'users', // Collection name for User model
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }, // Unwind the user array
      {
        $lookup: {
          from: 'userprofiles', // Collection name for UserProfile model
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      {
        $unwind: {
          path: '$profile',
          preserveNullAndEmptyArrays: true // Allow users without profiles
        }
      },
      {
        $project: {
          userId: '$userId',
          fullName: '$user.fullName',
          profileImageUrl: '$profile.profileImageUrl',
          rating: '$rating'
        }
      }
    ]);

    // Format the response data
    const formattedRatings = ratings.map(rating => ({
      userId: rating.userId,
      fullName: rating.fullName,
      profileImageUrl: rating.profileImageUrl || null,
      rating: rating.rating
    }));

    return apiResponse(res, {
      message: 'All ratings retrieved successfully',
      data: formattedRatings
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error retrieving ratings: ' + error.message,
      statusCode: 500
    });
  }
};


