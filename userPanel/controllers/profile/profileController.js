const UserProfile = require('../../models/Profile/userProfile');
const UserLesson = require("../../models/UserCourse/userLesson")
const UserAuth = require('../../models/Auth/Auth');
const UserCourse = require('../../models/UserCourse/userCourse');
const UserMainCourse = require('../../models/UserCourse/usermainCourse');
const Notification = require('../../../Notification/model/notification');
const Rating = require('../../models/Rating/rating');
const FCMToken = require('../../../Notification/model/fcmToken');
const Favourite = require('../../models/Favourite/favouriteCourse');
const {uploadImage} = require('../../../utils/s3Functions');
const { deleteImage } = require('../../../utils/s3Functions');
const { apiResponse } = require('../../../utils/apiResponse');
const mongoose = require('mongoose');



// // Create a new user profile (POST)
// exports.createUserProfile = async (req, res) => {
//     try {
//         const { address, email } = req.body;
//         const profileImageFile = req.file;
//         console.log("22", profileImageFile)

//         console.log("Request files:", req.files);
//         console.log("Profile image file:", profileImageFile);

//         // Validate userId from auth middleware
//         if (!req.userId || !mongoose.Types.ObjectId.isValid(req.userId)) {
//             console.log("Invalid or missing userId:", req.userId);
//             return apiResponse(res, {
//                 success: false,
//                 message: 'Invalid or missing user ID',
//                 statusCode: 400,
//             });
//         }

//         // Check if user exists in UserAuth
//         const user = await UserAuth.findById(req.userId);
//         if (!user) {
//             console.log("User not found for userId:", req.userId);
//             return apiResponse(res, {
//                 success: false,
//                 message: 'User not found',
//                 statusCode: 404,
//             });
//         }

//         // Check if profile already exists
//         const existingProfile = await UserProfile.findOne({ userId: req.userId });
//         if (existingProfile) {
//             console.log("Profile already exists for userId:", req.userId);
//             return apiResponse(res, {
//                 success: false,
//                 message: 'User profile already exists',
//                 statusCode: 409,
//             });
//         }

//         // Validate email if provided
//         if (email && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
//             console.log("Invalid email format:", email);
//             return apiResponse(res, {
//                 success: false,
//                 message: 'Invalid email format',
//                 statusCode: 400,
//             });
//         }

//         let profileImageUrl = null;
//         if (profileImageFile) {
//             if (!profileImageFile.buffer || !profileImageFile.mimetype || !profileImageFile.originalname) {
//                 console.log("Invalid profile image file:", profileImageFile);
//                 return apiResponse(res, {
//                     success: false,
//                     message: 'Invalid profile image file',
//                     statusCode: 400,
//                 });
//             }
//             const profileImageFileName = `user/profile/user_${req.userId}/${Date.now()}_${profileImageFile.originalname}`;
//             console.log("Uploading profile image to S3:", profileImageFileName);
//             profileImageUrl = await uploadImage(profileImageFile, profileImageFileName);
//             console.log("Profile image uploaded, URL:", profileImageUrl);
//         } else {
//             console.log("No profile image file provided");
//         }

//         const userProfile = new UserProfile({
//             userId: req.userId,
//             profileImageUrl,
//             address: address || null,
//             email: email || null
//         });

//         await userProfile.save();
//         console.log("User profile saved:", userProfile);

//         return apiResponse(res, {
//             success: true,
//             message: 'User profile created successfully',
//             data: userProfile,
//             statusCode: 201,
//         });
//     } catch (error) {
//         console.error('Error creating user profile:', error);
//         return apiResponse(res, {
//             success: false,
//             message: `Failed to create user profile: ${error.message}`,
//             statusCode: 500,
//         });
//     }
// };

// Update a user profile (PUT)
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { address, email } = req.body;
    const profileImageFile = req.file;

    console.log("Update request files:", req.file);
    console.log("Update profile image file:", profileImageFile);

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Invalid userId:", userId);
      return apiResponse(res, {
        success: false,
        message: 'Invalid user ID',
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

    // Find or create profile
    let userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      console.log("Profile not found, creating new profile for userId:", userId);
      userProfile = new UserProfile({ userId });
    }

    // Update fields if provided
    if (address !== undefined) {
      console.log("Updating address:", address);
      userProfile.address = address;
    }
    if (email !== undefined) {
      if (email && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        console.log("Invalid email format:", email);
        return apiResponse(res, {
          success: false,
          message: 'Invalid email format',
          statusCode: 400,
        });
      }
      console.log("Updating email:", email);
      userProfile.email = email;
    }

    // Update profile image if provided
    if (profileImageFile) {
      if (!profileImageFile.buffer || !profileImageFile.mimetype || !profileImageFile.originalname) {
        console.log("Invalid profile image file:", profileImageFile);
        return apiResponse(res, {
          success: false,
          message: 'Invalid profile image file',
          statusCode: 400,
        });
      }
      if (userProfile.profileImageUrl) {
        console.log("Deleting old profile image from S3:", userProfile.profileImageUrl);
        await deleteImage(userProfile.profileImageUrl);
      }
      const profileImageFileName = `user/profile/user_${userId}/${Date.now()}_${profileImageFile.originalname}`;
      console.log("Uploading new profile image to S3:", profileImageFileName);
      userProfile.profileImageUrl = await uploadImage(profileImageFile, profileImageFileName);
      console.log("New profile image uploaded, URL:", userProfile.profileImageUrl);
    }

    await userProfile.save();
    console.log("User profile saved/updated:", userProfile);

    return apiResponse(res, {
      success: true,
      message: userProfile.isNew ? 'User profile created successfully' : 'User profile updated successfully',
      data: userProfile,
      statusCode: userProfile.isNew ? 201 : 200,
    });
  } catch (error) {
    console.error('Error updating/creating user profile:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to update/create user profile: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Get authenticated user's profile (GET)
exports.getUserProfile = async (req, res) => {
    try {
        // Validate userId from auth middleware
        if (!req.userId || !mongoose.Types.ObjectId.isValid(req.userId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid or missing user ID',
                statusCode: 400,
            });
        }

        // Fetch UserAuth to get fullName and mobileNumber
        const user = await UserAuth.findById(req.userId, 'fullName mobileNumber');
        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 404,
            });
        }

        // Fetch UserProfile if it exists
        const profile = await UserProfile.findOne({ userId: req.userId });

        // Prepare response data
        const profileData = {
            _id: profile ? profile._id : null,
            userId: req.userId,
            fullName: user.fullName,
            mobileNumber: user.mobileNumber,
            profileImageUrl: profile ? profile.profileImageUrl : null,
            address: profile ? profile.address : null,
            email: profile ? profile.email : null
        };

        return apiResponse(res, {
            success: true,
            message: 'User profile retrieved successfully',
            data: profileData,
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to fetch user profile: ${error.message}`,
            statusCode: 500,
        });
    }
};



//get name and profileimage
exports.getUserbasicInfo = async (req, res) => {
  try {
    // Validate userId from auth middleware
    if (!req.userId || !mongoose.Types.ObjectId.isValid(req.userId)) {
      console.log("Invalid or missing userId:", req.userId);
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing user ID',
        statusCode: 400,
      });
    }

    // Fetch UserAuth to get fullName
    const user = await UserAuth.findById(req.userId, 'fullName');
    if (!user) {
      console.log("User not found for userId:", req.userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Fetch UserProfile to get profileImageUrl if it exists
    const profile = await UserProfile.findOne({ userId: req.userId }, 'profileImageUrl');

    // Prepare response data
    const profileData = {
      fullName: user.fullName,
      profileImageUrl: profile ? profile.profileImageUrl : null
    };

    console.log("Returning profile data:", profileData);

    return apiResponse(res, {
      success: true,
      message: 'User profile retrieved successfully',
      data: profileData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch user profile: ${error.message}`,
      statusCode: 500,
    });
  }
};


//get-profile-info

exports.getProfileInfo = async (req, res) => {
    try {
        // Validate userId from auth middleware
        if (!req.userId || !mongoose.Types.ObjectId.isValid(req.userId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid or missing user ID',
                statusCode: 400,
            });
        }

        // Fetch UserAuth to get fullName
        const user = await UserAuth.findById(req.userId, 'fullName');
        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 404,
            });
        }

        // Fetch UserProfile to get profileImageUrl and email if it exists
        const profile = await UserProfile.findOne({ userId: req.userId }, 'profileImageUrl email');

        // Prepare response data
        const profileData = {
            profileImage: profile ? profile.profileImageUrl : null,
            name: user.fullName,
            email: profile ? profile.email : null
        };

        return apiResponse(res, {
            success: true,
            message: 'User profile information retrieved successfully',
            data: profileData,
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error fetching user profile information:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to fetch user profile information: ${error.message}`,
            statusCode: 500,
        });
    }
};

// Delete a user profile and associated data (DELETE)
exports.deleteUserProfile = async (req, res) => {
  try {
    // Validate userId from auth middleware
    if (!req.userId || !mongoose.Types.ObjectId.isValid(req.userId)) {
      console.log("Invalid or missing userId:", req.userId);
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing user ID',
        statusCode: 400,
      });
    }

    // Check if user exists in UserAuth
    const user = await UserAuth.findById(req.userId);
    if (!user) {
      console.log("User not found for userId:", req.userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId: req.userId });
    if (!userProfile) {
      console.log("Profile not found for userId:", req.userId);
      return apiResponse(res, {
        success: false,
        message: 'User profile not found',
        statusCode: 404,
      });
    }

    // Delete profile image from S3 if it exists
    if (userProfile.profileImageUrl) {
      console.log("Deleting profile image from S3:", userProfile.profileImageUrl);
      await deleteImage(userProfile.profileImageUrl);
      console.log("Profile image deleted from S3");
    }

    // Delete all user courses
    await UserCourse.deleteMany({ userId: req.userId });
    console.log("All user courses deleted for userId:", req.userId);

    // Delete all user lessons
    await UserLesson.deleteMany({ userId: req.userId });
    console.log("All user lessons deleted for userId:", req.userId);

    // Delete all user main courses
    await UserMainCourse.deleteMany({ userId: req.userId });
    console.log("All user main courses deleted for userId:", req.userId);

    // Delete all notifications where user is either recipient or sender
    await Notification.deleteMany({
      $or: [
        { recipientId: req.userId },
        { senderId: req.userId }
      ]
    });
    console.log("All notifications deleted for userId:", req.userId);

    // Delete all ratings by the user
    await Rating.deleteMany({ userId: req.userId });
    console.log("All ratings deleted for userId:", req.userId);

    // Delete all favorites by the user
    await Favourite.deleteMany({ userId: req.userId });
    console.log("All favorites deleted for userId:", req.userId);

    // Delete the user profile
    await UserProfile.deleteOne({ userId: req.userId });
    console.log("User profile deleted for userId:", req.userId);

       // Delete all FCM tokens for the user
    await FCMToken.deleteMany({ userId: req.userId });
    console.log("All FCM tokens deleted for userId:", req.userId);

    // Delete the UserAuth record
    await UserAuth.deleteOne({ _id: req.userId });
    console.log("User authentication record deleted for userId:", req.userId);

    return apiResponse(res, {
      success: true,
      message: 'User profile and all associated data deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error deleting user profile:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to delete user profile: ${error.message}`,
      statusCode: 500,
    });
  }
};