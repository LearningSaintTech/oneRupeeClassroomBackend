const mongoose = require('mongoose');
const Favourite = require('../../models/Favourite/favouriteCourse');
const Subcourse = require('../../../course/models/subcourse');
const { apiResponse } = require('../../../utils/apiResponse');
const UserAuth = require("../../models/Auth/Auth");

// Toggle favorite status for a subcourse
exports.toggleFavourite = async (req, res) => {
    try {
        const {subcourseId}  = req.body;
        const userId = req.userId; 

        // Validate subcourseId and userId
        if (!mongoose.Types.ObjectId.isValid(subcourseId) || !mongoose.Types.ObjectId.isValid(userId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid subcourse ID or user ID',
                statusCode: 400,
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
        

        // Check if subcourse exists
        const subcourse = await Subcourse.findById(subcourseId);
        if (!subcourse) {
            return apiResponse(res, {
                success: false,
                message: 'Subcourse not found',
                statusCode: 404,
            });
        }

        // Check if favorite entry exists
        let favourite = await Favourite.findOne({ userId, subcourseId });

        if (favourite) {
            if (favourite.isLike) {
                // If isLike is true, set to false and delete the entry
                await Favourite.deleteOne({ _id: favourite._id });
                return apiResponse(res, {
                    success: true,
                    message: 'Removed from favorites',
                    data: { isLike: false },
                    statusCode: 200,
                });
            } else {
                // If isLike is false, set to true and save
                favourite.isLike = true;
                await favourite.save();
                return apiResponse(res, {
                    success: true,
                    message: 'Added to favorites',
                    data: { isLike: true },
                    statusCode: 200,
                });
            }
        } else {
            // Create new favorite entry with isLike = true
            favourite = new Favourite({
                userId,
                subcourseId,
                isLike: true
            });
            await favourite.save();
            return apiResponse(res, {
                success: true,
                message: 'Added to favorites',
                data: { isLike: true },
                statusCode: 201,
            });
        }
    } catch (error) {
        console.error('Error toggling favorite:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to toggle favorite: ${error.message}`,
            statusCode: 500,
        });
    }
};



exports.getFavouriteCourses = async (req, res) => {
    try {
        const userId = req.userId; // Assuming userId is set by auth middleware
        console.log(`Fetching favorite courses for userId: ${userId}`);

        // Validate userId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log(`Invalid user ID: ${userId}`);
            return apiResponse(res, {
                success: false,
                message: 'Invalid user ID',
                statusCode: 400,
            });
        }

        // Fetch user's purchased subcourses
        const user = await UserAuth.findById(userId).select('purchasedsubCourses');
        if (!user) {
            console.log(`User not found for ID: ${userId}`);
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 404,
            });
        }
        const purchasedSubcourseIds = user.purchasedsubCourses || [];
        console.log(`Purchased subcourses: ${purchasedSubcourseIds}`);

        // Find favorite entries for the user where isLike is true, excluding purchased subcourses
        const favourites = await Favourite.find({
            userId,
            isLike: true,
            subcourseId: { $nin: purchasedSubcourseIds }
        }).populate({
            path: 'subcourseId',
            select: 'subcourseName thumbnailImageUrl price avgRating totalLessons'
        });

        // Map favorites to response format
        const favouriteCourses = favourites.map(favourite => {
            const subcourse = favourite.subcourseId;
            return {
                id:favourite.subcourseId,
                isLike: favourite.isLike,
                subcourseName: subcourse.subcourseName,
                thumbnailImageUrl: subcourse.thumbnailImageUrl,
                price: subcourse.price,
                avgRating: subcourse.avgRating,
                totalLessons: subcourse.totalLessons
            };
        });

        // Handle case where no favorite courses are available after filtering
        if (!favouriteCourses.length) {
            console.log('No favorite courses available after filtering purchased subcourses');
            return apiResponse(res, {
                success: true,
                message: 'No favorite courses available',
                data: [],
                statusCode: 200,
            });
        }

        return apiResponse(res, {
            success: true,
            message: 'Favorite courses retrieved successfully',
            data: favouriteCourses,
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error fetching favorite courses:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to fetch favorite courses: ${error.message}`,
            statusCode: 500,
        });
    }
};