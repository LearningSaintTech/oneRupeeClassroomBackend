const UserProfile = require('../../models/Profile/userProfile');
const UserAuth = require('../../models/Auth/Auth');
const {uploadImage} = require('../../../utils/s3Functions');
const { deleteImage } = require('../../../utils/s3Functions');
const { apiResponse } = require('../../../utils/apiResponse');
const { deleteUserAccountById } = require('../../services/deleteUserAccount');
const mongoose = require('mongoose');

/** form-data / multipart sends every field as a string; JSON bodies already use objects/arrays. */
function parseObjectField(raw, { plainStringAs } = {}) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { skip: true };
  if (typeof raw === 'object' && !Buffer.isBuffer(raw) && raw !== null) {
    if (Array.isArray(raw)) return { error: 'Expected a plain object' };
    return { value: raw };
  }
  if (typeof raw !== 'string') return { error: 'Invalid format' };
  const t = raw.trim();
  if (!t) return { skip: true };
  try {
    const o = JSON.parse(t);
    if (o !== null && typeof o === 'object' && !Array.isArray(o)) return { value: o };
    return { error: 'Expected a JSON object' };
  } catch {
    if (plainStringAs) return { value: { [plainStringAs]: t } };
    return { error: 'Expected a JSON object (e.g. {"country":"India","state":"UP","city":"Agra"})' };
  }
}

function parseStringArrayField(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { skip: true };
  if (Array.isArray(raw)) return { value: raw };
  if (typeof raw !== 'string') return { error: 'Expected an array or JSON array string' };
  const t = raw.trim();
  if (!t) return { skip: true };
  try {
    const o = JSON.parse(t);
    if (Array.isArray(o)) return { value: o.map(String) };
    return { error: 'JSON value must be an array' };
  } catch {
    return { value: [t] };
  }
}

function normalizeGraduationYear(edu) {
  if (!edu || typeof edu !== 'object') return;
  const y = edu.graduationYear;
  if (typeof y === 'string' && y.trim() !== '' && !Number.isNaN(Number(y))) {
    edu.graduationYear = Number(y);
  }
}




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

      
        // ❤️ WISHLIST
        
      
       
      

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
//     
// };
// Update a user profile (PUT)
// Create a new user profile (POST)
// Create a new user profile (POST)
exports.createUserProfile = async (req, res) => {
  try {
      const userId = req.userId;
      const { 
          address, 
          email, 
          gender, 
          dateOfBirth, 
          bio, 
          education, 
          learningGoals, 
          skills 
      } = req.body;
      const skillsInput = skills !== undefined ? skills : req.body.Skills;
      
      const profileImageFile = req.file;

      let nextAddress = {};
      const addrRes = parseObjectField(address);
      if (addrRes.error) {
          return apiResponse(res, {
              success: false,
              message: addrRes.error,
              statusCode: 400,
          });
      }
      if (!addrRes.skip) nextAddress = addrRes.value;

      let nextEducation = {};
      const eduRes = parseObjectField(education, { plainStringAs: 'highestQualification' });
      if (eduRes.error) {
          return apiResponse(res, {
              success: false,
              message: eduRes.error,
              statusCode: 400,
          });
      }
      if (!eduRes.skip) {
          normalizeGraduationYear(eduRes.value);
          if (eduRes.value.graduationYear !== undefined && eduRes.value.graduationYear !== null && typeof eduRes.value.graduationYear !== 'number') {
              return apiResponse(res, {
                  success: false,
                  message: 'graduationYear must be a number',
                  statusCode: 400,
              });
          }
          nextEducation = eduRes.value;
      }

      const lgRes = parseStringArrayField(learningGoals);
      if (lgRes.error) {
          return apiResponse(res, {
              success: false,
              message: lgRes.error,
              statusCode: 400,
          });
      }
      const nextLearningGoals = lgRes.skip ? [] : lgRes.value;

      const skRes = parseStringArrayField(skillsInput);
      if (skRes.error) {
          return apiResponse(res, {
              success: false,
              message: skRes.error,
              statusCode: 400,
          });
      }
      const nextSkills = skRes.skip ? [] : skRes.value;

      // 1. Validate userId
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          return apiResponse(res, {
              success: false,
              message: 'Invalid or missing user ID',
              statusCode: 400,
          });
      }

      // 2. Check if user exists in Auth
      const user = await UserAuth.findById(userId);
      if (!user) {
          return apiResponse(res, {
              success: false,
              message: 'User not found',
              statusCode: 404,
          });
      }

      // 3. Check if profile already exists
      const existingProfile = await UserProfile.findOne({ userId });
      if (existingProfile) {
          return apiResponse(res, {
              success: false,
              message: 'User profile already exists. Please use update instead.',
              statusCode: 409,
          });
      }

      // 4. Handle Profile Image Upload
      let profileImageUrl = null;
      if (profileImageFile) {
          const profileImageFileName = `user/profile/user_${userId}/${Date.now()}_${profileImageFile.originalname}`;
          profileImageUrl = await uploadImage(profileImageFile, profileImageFileName);
      }

      // 5. Create Profile Object with all new fields
      const userProfile = new UserProfile({
          userId,
          profileImageUrl,
          email: email || null,
          gender: gender || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          bio: bio || "",
          address: nextAddress,
          education: nextEducation,
          learningGoals: nextLearningGoals,
          skills: nextSkills
      });

      await userProfile.save();

      return apiResponse(res, {
          success: true,
          message: 'User profile created successfully',
          data: userProfile,
          statusCode: 201,
      });
  } catch (error) {
      console.error('Error creating user profile:', error);
      return apiResponse(res, {
          success: false,
          message: `Failed to create user profile: ${error.message}`,
          statusCode: 500,
      });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      address,
      name,
      fullName,
      gender,
      dateOfBirth,
      bio,
      education,
      learningGoals,
      skills
    } = req.body;
    
    const skillsInput = skills !== undefined ? skills : req.body.Skills;
    const profileImageFile = req.file;
    console.log("Update request files:", req.file);
    console.log("Update profile image file:", profileImageFile);
    console.log("Update request body:", req.body);
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
    const displayName = name !== undefined ? name : fullName;
    // Update name/fullName in UserAuth if provided
    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.trim() === '') {
        console.log("Invalid name:", displayName);
        return apiResponse(res, {
          success: false,
          message: 'Name must be a non-empty string',
          statusCode: 400,
        });
      }
      console.log("Updating name:", displayName);
      const trimmedName = displayName.trim();
      user.fullName = trimmedName;
      user.name = trimmedName;
      await user.save();
    }
    // Find or create profile
    let userProfile = await UserProfile.findOne({ userId });
    if (!userProfile) {
      console.log("Profile not found, creating new profile for userId:", userId);
      userProfile = new UserProfile({ userId });
    }
    // Update fields if provided
    if (address !== undefined) {
      const addrRes = parseObjectField(address);
      if (addrRes.error) {
        return apiResponse(res, {
          success: false,
          message: addrRes.error,
          statusCode: 400,
        });
      }
      if (!addrRes.skip) {
        console.log("Updating address:", addrRes.value);
        userProfile.address = addrRes.value;
      }
    }
    // if (email !== undefined) {
    //   if (email && !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    //     console.log("Invalid email format:", email);
    //     return apiResponse(res, {
    //       success: false,
    //       message: 'Invalid email format',
    //       statusCode: 400,
    //     });
    //   }
    //   console.log("Updating email:", email);
    //   userProfile.email = email;
    // }
    if (gender !== undefined) {
      if (!["male", "female", "other"].includes(gender)) {
        console.log("Invalid gender:", gender);
        return apiResponse(res, {
          success: false,
          message: 'Invalid gender value',
          statusCode: 400,
        });
      }
      console.log("Updating gender:", gender);
      userProfile.gender = gender;
    }
    if (dateOfBirth !== undefined) {
      const parsedDate = new Date(dateOfBirth);
      if (isNaN(parsedDate.getTime())) {
        console.log("Invalid dateOfBirth:", dateOfBirth);
        return apiResponse(res, {
          success: false,
          message: 'Invalid date format for dateOfBirth',
          statusCode: 400,
        });
      }
      console.log("Updating dateOfBirth:", parsedDate);
      userProfile.dateOfBirth = parsedDate;
    }
    if (bio !== undefined) {
      console.log("Updating bio:", bio);
      userProfile.bio = bio;
    }
    if (education !== undefined) {
      const eduRes = parseObjectField(education, { plainStringAs: 'highestQualification' });
      if (eduRes.error) {
        return apiResponse(res, {
          success: false,
          message: eduRes.error,
          statusCode: 400,
        });
      }
      if (!eduRes.skip) {
        normalizeGraduationYear(eduRes.value);
        if (eduRes.value.graduationYear !== undefined && eduRes.value.graduationYear !== null && typeof eduRes.value.graduationYear !== 'number') {
          return apiResponse(res, {
            success: false,
            message: 'graduationYear must be a number',
            statusCode: 400,
          });
        }
        console.log("Updating education:", eduRes.value);
        userProfile.education = eduRes.value;
      }
    }
    if (learningGoals !== undefined) {
      const lgRes = parseStringArrayField(learningGoals);
      if (lgRes.error) {
        return apiResponse(res, {
          success: false,
          message: lgRes.error,
          statusCode: 400,
        });
      }
      if (!lgRes.skip) {
        console.log("Updating learningGoals:", lgRes.value);
        userProfile.learningGoals = lgRes.value;
      }
    }
    if (skillsInput !== undefined) {
      const skRes = parseStringArrayField(skillsInput);
      if (skRes.error) {
        return apiResponse(res, {
          success: false,
          message: skRes.error,
          statusCode: 400,
        });
      }
      if (!skRes.skip) {
        console.log("Updating skills:", skRes.value);
        userProfile.skills = skRes.value;
      }
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
      data: {
        name: user.name || user.fullName,
        fullName: user.fullName,
        ...userProfile.toObject() // Include all profile fields
      },
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
        const user = await UserAuth.findById(req.userId, 'name fullName email mobileNumber isEmailVerified');
        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 404,
            });
        }
        // Fetch UserProfile if it exists (include all fields)
        const profile = await UserProfile.findOne({ userId: req.userId });
        // Prepare response data with all schema fields
        const profileData = {
            _id: profile ? profile._id : null,
            userId: req.userId,
            name: user.name || user.fullName,
            fullName: user.fullName,
            mobileNumber: user.mobileNumber,
            profileImageUrl: profile ? profile.profileImageUrl : null,
            email:  user.email,
            gender: profile ? profile.gender : null,
            dateOfBirth: profile ? profile.dateOfBirth : null,
            bio: profile ? profile.bio : null,
            education: profile ? profile.education : null,
            learningGoals: profile ? profile.learningGoals : [],
            skills: profile ? profile.skills : [],
            address: profile ? profile.address : null,
            isEmailVerified: user.isEmailVerified
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
    const user = await UserAuth.findById(req.userId, 'name fullName');
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
      name: user.name || user.fullName,
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
        const user = await UserAuth.findById(req.userId, 'name fullName');
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
            name: user.name || user.fullName,
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
    const result = await deleteUserAccountById(req.userId);
    if (!result.deleted) {
      const statusCode = result.reason === 'user_not_found' ? 404 : 400;
      return apiResponse(res, {
        success: false,
        message:
          result.reason === 'user_not_found'
            ? 'User not found'
            : 'Failed to delete user account',
        statusCode,
      });
    }

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



