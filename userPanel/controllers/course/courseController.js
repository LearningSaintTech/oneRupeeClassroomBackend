const mongoose = require('mongoose');
const Subcourse = require('../../../adminPanel/models/course/subcourse');
const { apiResponse } = require('../../../utils/apiResponse');
const Lesson = require("../../../adminPanel/models/course/lesson");
const Course = require("../../../adminPanel/models/course/course");
const UserCourse = require("../../models/UserCourse/userCourse");
const User = require("../../models/Auth/Auth");
const UserProfile = require("../../models/Profile/userProfile");
const userLesson = require("../../models/UserCourse/userLesson");
const Promo = require("../../../Promo/models/promo");
const subcourse = require('../../../adminPanel/models/course/subcourse');
const UsermainCourse = require("../../models/UserCourse/usermainCourse");
const InternshipLetter = require("../../../adminPanel/models/InternshipLetter/internshipLetter")
const CertificatePayment = require('../../models/certificates/certificate');
const RecordedLesson = require('../../models/recordedLesson/recordedLesson');

// Get all subcourses with details
exports.getAllSubcourses = async (req, res) => {
  try {
    const userId = req.userId; // Assuming user ID is available from JWT middleware
    console.log(`Fetching subcourses for userId: ${userId}`);

    // Extract pagination parameters from query
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skip = (page - 1) * limit; // Calculate skip value for pagination

    let subcourses = [];
    let totalSubcourses = 0;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Valid userId: ${userId}, checking purchasedsubCourses...`);
      const user = await User.findById(userId).select('purchasedsubCourses');
      if (user) {
        console.log(`User found with purchasedsubCourses: ${user.purchasedsubCourses}`);
        // Count total subcourses for pagination metadata
        totalSubcourses = await Subcourse.countDocuments({
          _id: { $nin: user.purchasedsubCourses || [] },
        });
        // Fetch paginated subcourses
        subcourses = await Subcourse.find(
          { _id: { $nin: user.purchasedsubCourses || [] } },
          'subcourseName thumbnailImageUrl totalLessons avgRating price isUpComingCourse'
        )
          .skip(skip)
          .limit(limit);
        console.log(`Found ${subcourses.length} subcourses where courseId is not in purchasedsubCourses`);
      } else {
        console.log(`User not found for ID: ${userId}, fetching all subcourses...`);
        totalSubcourses = await Subcourse.countDocuments();
        subcourses = await Subcourse.find(
          {},
          'subcourseName thumbnailImageUrl totalLessons avgRating price isUpComingCourse'
        )
          .skip(skip)
          .limit(limit);
      }
    } else {
      console.log(`Invalid or missing userId: ${userId}, fetching all subcourses...`);
      totalSubcourses = await Subcourse.countDocuments();
      subcourses = await Subcourse.find(
        {},
        'subcourseName thumbnailImageUrl totalLessons avgRating price isUpComingCourse'
      )
        .skip(skip)
        .limit(limit);
    }

    if (!subcourses.length) {
      console.log('No subcourses available after filtering');
      return apiResponse(res, {
        success: true,
        message: 'No subcourses available',
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        statusCode: 200,
      });
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalSubcourses / limit);

    return apiResponse(res, {
      success: true,
      message: 'Subcourses retrieved successfully',
      data: subcourses,
      pagination: {
        total: totalSubcourses,
        page,
        limit,
        totalPages,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching subcourses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};
// Get popular courses
exports.getPopularCourses = async (req, res) => {
  try {
    const userId = req.userId; // Assuming user ID is available from JWT middleware
    console.log(`Fetching popular courses for userId: ${userId}`);

    // Extract pagination parameters from query
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skip = (page - 1) * limit; // Calculate skip value for pagination

    let subcourses = [];
    let totalSubcourses = 0;

    // Check if userId is valid and fetch purchased subcourses
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Valid userId: ${userId}, checking purchasedsubCourses...`);
      const user = await User.findById(userId).select('purchasedsubCourses');
      if (user) {
        console.log(`User found with purchasedsubCourses: ${user.purchasedsubCourses}`);
        // Count total subcourses excluding purchased ones
        totalSubcourses = await Subcourse.countDocuments({
          _id: { $nin: user.purchasedsubCourses || [] },
        });
        // Fetch paginated subcourses, sorted by totalStudentsEnrolled (most popular first)
        subcourses = await Subcourse.find({
          _id: { $nin: user.purchasedsubCourses || [] },
        })
          .sort({ totalStudentsEnrolled: -1 }) // Descending order
          .skip(skip)
          .limit(limit)
          .select('subcourseName thumbnailImageUrl totalLessons avgRating totalStudentsEnrolled price isUpComingCourse');
        console.log(`Found ${subcourses.length} popular subcourses excluding purchased ones`);
      } else {
        console.log(`User not found for ID: ${userId}, fetching all popular subcourses...`);
        totalSubcourses = await Subcourse.countDocuments();
        subcourses = await Subcourse.find()
          .sort({ totalStudentsEnrolled: -1 })
          .skip(skip)
          .limit(limit)
          .select('subcourseName thumbnailImageUrl totalLessons avgRating totalStudentsEnrolled price isUpComingCourse');
      }
    } else {
      console.log(`Invalid or missing userId: ${userId}, fetching all popular subcourses...`);
      totalSubcourses = await Subcourse.countDocuments();
      subcourses = await Subcourse.find()
        .sort({ totalStudentsEnrolled: -1 })
        .skip(skip)
        .limit(limit)
        .select('subcourseName thumbnailImageUrl totalLessons avgRating totalStudentsEnrolled price isUpComingCourse');
    }

    // Map subcourses to desired output format
    const popularCourses = subcourses.map(subcourse => ({
      _id: subcourse._id,
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl,
      totalLessons: subcourse.totalLessons,
      avgRating: subcourse.avgRating,
      totalStudentsEnrolled: subcourse.totalStudentsEnrolled,
      price: subcourse.price,
      isUpComingCourse: subcourse.isUpComingCourse
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalSubcourses / limit);

    if (!popularCourses.length) {
      return apiResponse(res, {
        success: true,
        message: 'No popular courses available',
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Popular courses retrieved successfully',
      data: popularCourses,
      pagination: {
        total: totalSubcourses,
        page,
        limit,
        totalPages,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching popular courses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch popular courses: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Get newest courses
exports.getNewestCourses = async (req, res) => {
  try {
    const userId = req.userId; // Assuming user ID is available from JWT middleware
    console.log(`Fetching newest courses for userId: ${userId}`);

    // Extract pagination parameters from query
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
    const skip = (page - 1) * limit; // Calculate skip value for pagination

    let subcourses = [];
    let totalSubcourses = 0;

    // Check if userId is valid and fetch purchased subcourses
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Valid userId: ${userId}, checking purchasedsubCourses...`);
      const user = await User.findById(userId).select('purchasedsubCourses');
      if (user) {
        console.log(`User found with purchasedsubCourses: ${user.purchasedsubCourses}`);
        // Count total subcourses excluding purchased ones
        totalSubcourses = await Subcourse.countDocuments({
          _id: { $nin: user.purchasedsubCourses || [] },
        });
        // Fetch paginated subcourses, sorted by createdAt (newest first)
        subcourses = await Subcourse.find({
          _id: { $nin: user.purchasedsubCourses || [] },
        })
          .sort({ createdAt: -1 }) // Descending order (newest first)
          .skip(skip)
          .limit(limit)
          .select('subcourseName thumbnailImageUrl totalLessons avgRating price isUpComingCourse');
        console.log(`Found ${subcourses.length} newest subcourses excluding purchased ones`);
      } else {
        console.log(`User not found for ID: ${userId}, fetching all newest subcourses...`);
        totalSubcourses = await Subcourse.countDocuments();
        subcourses = await Subcourse.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('subcourseName thumbnailImageUrl totalLessons avgRating price isUpComingCourse');
      }
    } else {
      console.log(`Invalid or missing userId: ${userId}, fetching all newest subcourses...`);
      totalSubcourses = await Subcourse.countDocuments();
      subcourses = await Subcourse.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('subcourseName thumbnailImageUrl totalLessons avgRating price');
    }

    // Map subcourses to desired output format
    const newestCourses = subcourses.map(subcourse => ({
      _id: subcourse._id,
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl,
      totalLessons: subcourse.totalLessons,
      avgRating: subcourse.avgRating,
      price: subcourse.price,
      isUpComingCourse: subcourse.isUpComingCourse
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalSubcourses / limit);

    if (!newestCourses.length) {
      return apiResponse(res, {
        success: true,
        message: 'No newest courses available',
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Newest courses retrieved successfully',
      data: newestCourses,
      pagination: {
        total: totalSubcourses,
        page,
        limit,
        totalPages,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching newest courses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch newest courses: ${error.message}`,
      statusCode: 500,
    });
  }
};


exports.getSubcourseById = async (req, res) => {
  try {
    const subcourseId = req.params.id;
    const userId = req.userId; // Assuming user ID is available from JWT middleware
    console.log(`Fetching subcourse with ID: ${subcourseId}, User ID: ${userId}`);

    // Validate subcourseId
    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`Invalid subcourse ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Check payment status if userId is provided
    let paymentStatus = false;
    let subcourseCompleted = false;
    let isRecordedLessonPurchased = false;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Valid userId: ${userId}, checking user...`);
      const user = await User.findById(userId);
      if (user) {
        console.log(`User found: ${userId}, checking purchasedsubCourses...`);
        // Check payment status
        paymentStatus = user.purchasedsubCourses.some(
          purchase => purchase.toString() === subcourseId.toString()
        );
        console.log(`Payment status for subcourse ${subcourseId}: ${paymentStatus}`);

        // Check subcourse completion status
        const userCourse = await UserCourse.findOne({ userId, subcourseId });
        if (userCourse) {
          subcourseCompleted = userCourse.isCompleted;
          console.log(`Subcourse ${subcourseId} completion status: ${subcourseCompleted}`);
        } else {
          console.log(`No UserCourse found for userId: ${userId}, subcourseId: ${subcourseId}`);
        }

        // Check recorded lesson purchase status
        const recordedLesson = await RecordedLesson.findOne({ userId, subcourseId, paymentStatus: true });
        if (recordedLesson) {
          isRecordedLessonPurchased = true;
          console.log(`Recorded lesson purchased for subcourse ${subcourseId}: true`);
        } else {
          console.log(`No recorded lesson purchase found for userId: ${userId}, subcourseId: ${subcourseId}`);
        }
      } else {
        console.log(`User not found for ID: ${userId}`);
      }
    } else {
      console.log(`Invalid or missing userId: ${userId}`);
    }

    // Fetch the top 5 subcourses by totalStudentsEnrolled to determine best sellers
    console.log('Fetching top 5 subcourses for best seller threshold...');
    const topSubcourses = await Subcourse.aggregate([
      { $sort: { totalStudentsEnrolled: -1 } },
      { $limit: 5 },
      { $project: { totalStudentsEnrolled: 1 } }
    ]);
    console.log(`Top subcourses: ${JSON.stringify(topSubcourses)}`);

    // Extract the minimum totalStudentsEnrolled among the top 5
    const bestSellerThreshold = topSubcourses.length > 0 ? topSubcourses[topSubcourses.length - 1].totalStudentsEnrolled : 0;
    console.log(`Best seller threshold: ${bestSellerThreshold}`);

    // Aggregation pipeline for the requested subcourse
    console.log(`Running aggregation pipeline for subcourse: ${subcourseId}`);
    const subcourse = await Subcourse.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(subcourseId) }
      },
      {
        $lookup: {
          from: 'lessons', // Collection name for Lesson model
          localField: '_id',
          foreignField: 'subcourseId',
          as: 'lessons'
        }
      },
      {
        $unwind: {
          path: '$lessons',
          preserveNullAndEmptyArrays: true // Keep subcourse even if no lessons
        }
      },
      {
        $lookup: {
          from: 'userlessons', // Collection name for UserLesson model
          let: { lessonId: '$lessons._id', userId: new mongoose.Types.ObjectId(userId) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$lessonId', '$$lessonId'] },
                    { $eq: ['$userId', '$$userId'] }
                  ]
                }
              }
            },
            { $project: { isCompleted: 1 } }
          ],
          as: 'lessonCompletion'
        }
      },
      {
        $group: {
          _id: '$_id',
          introVideoUrl: { $first: '$introVideoUrl' },
          subcourseName: { $first: '$subcourseName' },
          avgRating: { $first: '$avgRating' },
          totalStudentsEnrolled: { $first: '$totalStudentsEnrolled' },
          totalDuration: { $first: '$totalDuration' },
          subCourseDescription: { $first: '$subCourseDescription' },
          totalLessons: { $first: '$totalLessons' },
          price: { $first: '$price' },
          recordedlessonsPrice: { $first: '$recordedlessonsPrice' },
          recordedlessonsLink: { $first: '$recordedlessonsLink' },
          appleProductId: { $first: '$appleProductId' },
          appleRecordedProductId: { $first: '$appleRecordedProductId' },
          lessons: {
            $push: {
              lessonId: '$lessons._id',
              lessonName: '$lessons.lessonName',
              thumbnailImageUrl: '$lessons.thumbnailImageUrl',
              duration: '$lessons.duration',
              startTime: '$lessons.startTime',
              endTime: '$lessons.endTime',
              date: '$lessons.date',
              isCompleted: {
                $cond: {
                  if: { $eq: [{ $size: '$lessonCompletion' }, 0] },
                  then: false,
                  else: { $arrayElemAt: ['$lessonCompletion.isCompleted', 0] }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          introVideoUrl: 1,
          subcourseName: 1,
          avgRating: 1,
          totalStudentsEnrolled: 1,
          totalDuration: 1,
          subCourseDescription: 1,
          totalLessons: 1,
          price: 1,
          recordedlessonsPrice: 1,
          recordedlessonsLink: 1,
          appleProductId: 1,
          appleRecordedProductId: 1,
          lessons: 1,
          isBestSeller: {
            $cond: {
              if: { $gte: ['$totalStudentsEnrolled', bestSellerThreshold] },
              then: true,
              else: false
            }
          },
          paymentStatus: { $literal: paymentStatus },
          isCompleted: { $literal: subcourseCompleted }, // Add subcourse completion status
          isRecordedLessonPurchased: { $literal: isRecordedLessonPurchased }
        }
      }
    ]).then(results => {
      console.log(`Aggregation result: ${JSON.stringify(results[0])}`);
      return results[0];
    }); // Get the first (and only) result

    if (!subcourse) {
      console.log(`Subcourse not found for ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    console.log(`Subcourse details retrieved successfully for ID: ${subcourseId}`);
    return apiResponse(res, {
      success: true,
      message: 'Subcourse details retrieved successfully',
      data: subcourse,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching subcourse by ID:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch subcourse: ${error.message}`,
      statusCode: 500,
    });
  }
};

//get-all-courses
exports.getAllCourses = async (req, res) => {
  try {
    // Get pagination parameters from query (default to page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Aggregate courses with total subcourses count and pagination
    const courses = await Course.aggregate([
      {
        $lookup: {
          from: 'subcourses',
          localField: '_id',
          foreignField: 'courseId',
          as: 'subcourses'
        }
      },
      {
        $project: {
          courseName: 1,
          CoverImageUrl: 1,
          totalModules: { $size: '$subcourses' },
        }
      },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Get total count for pagination metadata
    const totalCourses = await Course.countDocuments();

    if (!courses.length) {
      return apiResponse(res, {
        success: false,
        message: 'No courses found',
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Courses retrieved successfully',
      data: {
        courses,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCourses / limit),
          totalCourses,
          limit
        }
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching all courses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch courses: ${error.message}`,
      statusCode: 500,
    });
  }
};


//get purchased courses

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
        data: [],
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
      .select('subcourseName totalLessons thumbnailImageUrl')
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
        totalLessons: subcourse.totalLessons,
        thumbnailImageUrl: subcourse.thumbnailImageUrl,
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
//get students
exports.getEnrolledUsersBySubcourse = async (req, res) => {
  try {
    const subcourseId = req.params.id;

    // Validate subcourseId
    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourseId',
        statusCode: 400,
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

    // Get pagination parameters from query (default to page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find users who have purchased the subcourse with pagination
    const users = await User.find({
      purchasedsubCourses: subcourseId,
    })
      .select('fullName')
      .skip(skip)
      .limit(limit);

    // Get total count for pagination metadata
    const totalUsers = await User.countDocuments({
      purchasedsubCourses: subcourseId,
    });

    // If no users have purchased the subcourse, return empty array
    if (!users || users.length === 0) {
      return apiResponse(res, {
        success: true,
        message: 'No users enrolled in this subcourse',
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

    // Fetch profile images from UserProfile
    const userIds = users.map(user => user._id);
    const userProfiles = await UserProfile.find({
      userId: { $in: userIds },
    }).select('userId profileImageUrl');

    // Map users to include fullName and profileImageUrl
    const result = users.map(user => {
      const profile = userProfiles.find(p => p.userId.toString() === user._id.toString());
      return {
        userId: user._id,
        fullName: user.fullName,
        profileImageUrl: profile ? profile.profileImageUrl || '' : '',
      };
    });

    return apiResponse(res, {
      success: true,
      message: 'Enrolled users retrieved successfully',
      data: {
        users: result,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalUsers / limit),
          totalUsers,
          limit,
        },
      },
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch enrolled users: ${error.message}`,
      statusCode: 500,
    });
  }
};

exports.getSubcoursesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;
    console.log(`Fetching subcourses for courseId: ${courseId}, userId: ${userId}`);

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`Invalid course ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Check if course exists and fetch courseName
    const course = await Course.findById(courseId).select('courseName');
    if (!course) {
      console.log(`Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    // Fetch user course completion status
    const userCourse = await UsermainCourse.findOne({ userId, courseId }).select('isCompleted');
    const isCourseCompleted = userCourse ? userCourse.isCompleted : false;

    // Get pagination parameters from query (default to page 1 and 10 items per page)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Fetch subcourses with thumbnail, price, totalLessons, isLike, and avgRating with pagination
    const subcourses = await Subcourse.aggregate([
      {
        $match: { courseId: new mongoose.Types.ObjectId(courseId) }
      },
      {
        $lookup: {
          from: 'favourites',
          let: { subcourseId: '$_id', userId: new mongoose.Types.ObjectId(userId) },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$subcourseId', '$$subcourseId'] },
                    { $eq: ['$userId', '$$userId'] }
                  ]
                }
              }
            },
            { $project: { isLike: 1 } }
          ],
          as: 'favourite'
        }
      },
      {
        $lookup: {
          from: 'ratings',
          localField: '_id',
          foreignField: 'subcourseId',
          as: 'ratings'
        }
      },
      {
        $project: {
          subcourseName: 1,
          price: 1,
          thumbnailImageUrl: 1,
          totalLessons: 1,
          isUpComingCourse: 1,
          isLike: {
            $cond: {
              if: { $eq: [{ $size: '$favourite' }, 0] },
              then: false,
              else: { $arrayElemAt: ['$favourite.isLike', 0] }
            }
          },
          avgRating: {
            $cond: {
              if: { $eq: [{ $size: '$ratings' }, 0] },
              then: 0,
              else: { $avg: '$ratings.rating' }
            }
          }
        }
      },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Get total count for pagination metadata
    const totalSubcourses = await Subcourse.countDocuments({
      courseId: new mongoose.Types.ObjectId(courseId),
    });

    // Handle case where no subcourses are found
    if (!subcourses.length) {
      console.log(`No subcourses found for courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'No subcourses found for this course',
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Subcourses retrieved successfully',
      data: {
        courseName: course.courseName,
        isCourseCompleted,
        subcourses,
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
    console.error('Error fetching subcourses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};


//progress-banner
exports.progressBanner = async (req, res) => {
  try {
    const userId = req.userId; // Assuming user ID is available from JWT middleware
    console.log(`Fetching progress banner data for userId: ${userId}`);

    // Validate userId
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Invalid user ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid user ID',
        statusCode: 400,
      });
    }

    let recentSubcourse = null;
    let recentPurchasedSubcourse = null;
    let promos = [];

    // 1. Fetch the most recent subcourse (not purchased by the user)
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId).select('purchasedsubCourses');
      if (user) {
        console.log(`User found with purchasedsubCourses: ${user.purchasedsubCourses}`);
        recentSubcourse = await Subcourse.findOne(
          { _id: { $nin: user.purchasedsubCourses || [] } },
          'subcourseName thumbnailImageUrl totalLessons'
        ).sort({ createdAt: -1 });
      } else {
        console.log(`User not found for ID: ${userId}, fetching most recent subcourse...`);
        recentSubcourse = await Subcourse.findOne(
          {},
          'subcourseName thumbnailImageUrl totalLessons'
        ).sort({ createdAt: -1 });
      }
    } else {
      console.log(`No userId provided, fetching most recent subcourse...`);
      recentSubcourse = await Subcourse.findOne(
        {},
        'subcourseName thumbnailImageUrl totalLessons'
      ).sort({ createdAt: -1 });
    }


    // 2. Fetch the most recent purchased, non-completed subcourse
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Checking for recent purchased subcourse...");

      // Log the filters before querying
      console.log("Query filters:", {
        userId,
        isCompleted: false,
        paymentStatus: true
      });

      recentPurchasedSubcourse = await UserCourse.findOne(
        { userId, isCompleted: false, paymentStatus: true },
        'subcourseId progress'
      )
        .populate({
          path: 'subcourseId',
          select: 'subcourseName thumbnailImageUrl totalLessons'
        })
        .sort({ paymentDate: -1 });

      console.log("Raw recentPurchasedSubcourse query result:", recentPurchasedSubcourse);

      // Check if the query returned a result
      if (!recentPurchasedSubcourse) {
        console.log("No UserCourse found matching the filters. Debugging possible reasons...");
        // Check what records exist for the user
        const allUserCourses = await UserCourse.find({ userId });
        console.log("All UserCourse entries for user:", allUserCourses);

        const paidCourses = await UserCourse.find({ userId, paymentStatus: true });
        console.log("Paid UserCourse entries for user:", paidCourses);

        const incompleteCourses = await UserCourse.find({ userId, isCompleted: false });
        console.log("Incomplete UserCourse entries for user:", incompleteCourses);
      }

      // Format the response for the purchased subcourse
      if (recentPurchasedSubcourse && recentPurchasedSubcourse.subcourseId) {
        recentPurchasedSubcourse = {
          _id: recentPurchasedSubcourse.subcourseId._id,
          subcourseName: recentPurchasedSubcourse.subcourseId.subcourseName,
          thumbnailImageUrl: recentPurchasedSubcourse.subcourseId.thumbnailImageUrl,
          totalLessons: recentPurchasedSubcourse.subcourseId.totalLessons,
          progress: recentPurchasedSubcourse.progress
        };
      } else {
        recentPurchasedSubcourse = null;
      }
    }
    // 3. Fetch all promos
    promos = await Promo.find({}, 'promo');
    console.log(`Found ${promos.length} promos`);

    // Prepare the response
    const responseData = {
      recentSubcourse: recentSubcourse || null,
      recentPurchasedSubcourse: recentPurchasedSubcourse || null,
      promos: promos || []
    };

    // Handle case where no data is available
    if (!recentSubcourse && !recentPurchasedSubcourse && !promos.length) {
      console.log('No data available for progress banner');
      return apiResponse(res, {
        success: true,
        message: 'No data available',
        data: responseData,
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Progress banner data retrieved successfully',
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching progress banner data:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch progress banner data: ${error.message}`,
      statusCode: 500,
    });
  }
};



// Get Subcourse Name and Certificate Description
exports.getSubcourseNameAndCertDesc = async (req, res) => {
  try {
    const { subcourseId } = req.params;
    const userId = req.userId; // Assuming userId is set by auth middleware

    console.log(`[DEBUG] Fetching subcourse name and certificate description for subcourseId: ${subcourseId}, userId: ${userId}`);

    // Validate subcourseId
    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`[DEBUG] Invalid subcourse ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`[DEBUG] Invalid user ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid user ID',
        statusCode: 400,
      });
    }

    // Check if CertificatePayment model is valid
    if (typeof CertificatePayment.findOne !== 'function') {
      console.error('[DEBUG] CertificatePayment.findOne is not a function');
      return apiResponse(res, {
        success: false,
        message: 'Internal server error: CertificatePayment model is invalid',
        statusCode: 500,
      });
    }

    // Fetch the subcourse with only subcourseName and certificateDescription
    const subcourse = await Subcourse.findById(
      subcourseId,
      'subcourseName certificateDescription certificatePrice appleCertificateProductId appleRecordedProductId'
    );

    // Handle case where subcourse is not found
    if (!subcourse) {
      console.log(`[DEBUG] Subcourse not found for ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Check payment status
    const certificatePayment = await CertificatePayment.findOne({ userId, subcourseId, paymentStatus: true });
    const isPaymentDone = !!certificatePayment; // true if payment exists and is completed, false otherwise

    // Prepare response data
    const responseData = {
      subcourseName: subcourse.subcourseName,
      certificateDescription: subcourse.certificateDescription,
      certificatePrice: subcourse.certificatePrice,
      appleCertificateProductId: subcourse.appleCertificateProductId,
      appleRecordedProductId: subcourse.appleRecordedProductId,
      isPaymentDone,
    };

    return apiResponse(res, {
      success: true,
      message: 'Subcourse retrieved successfully',
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('[DEBUG] Error fetching subcourse:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch subcourse: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Get Course Name, Description, and Upload Status
exports.getCourseNameAndDesc = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId; // Assuming userId is set by auth middleware

    console.log(`[DEBUG] Fetching course name, description, and upload status for courseId: ${courseId}, userId: ${userId}`);

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`[DEBUG] Invalid course ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`[DEBUG] Invalid user ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid user ID',
        statusCode: 400,
      });
    }

    // Check if CertificatePayment model is valid
    if (typeof CertificatePayment.findOne !== 'function') {
      console.error('[DEBUG] CertificatePayment.findOne is not a function');
      return apiResponse(res, {
        success: false,
        message: 'Internal server error: CertificatePayment model is invalid',
        statusCode: 500,
      });
    }

    // Fetch the course with only courseName, certificateDescription, and CourseInternshipPrice
    const course = await Course.findById(
      courseId,
      'courseName certificateDescription CourseInternshipPrice appleCertificateProductId'
    );

    // Handle case where course is not found
    if (!course) {
      console.log(`[DEBUG] Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    // Fetch the upload status from InternshipLetter for the user and course
    const internshipLetter = await InternshipLetter.findOne(
      { userId, courseId },
      'uploadStatus'
    );

    // Check payment status
    const certificatePayment = await CertificatePayment.findOne({ userId, courseId, paymentStatus: true });
    const isPaymentDone = !!certificatePayment; // true if payment exists and is completed, false otherwise

    // Prepare the response data
    const responseData = {
      courseName: course.courseName,
      certificateDescription: course.certificateDescription,
      uploadStatus: internshipLetter ? internshipLetter.uploadStatus : 'upload', // Default to 'upload' if no record found
      price: course.CourseInternshipPrice,
      certificatePrice: course.CourseInternshipPrice,
      appleCertificateProductId: course.appleCertificateProductId,
      isPaymentDone,
    };

    console.log('[DEBUG] Response data:', responseData);

    return apiResponse(res, {
      success: true,
      message: 'Course and upload status retrieved successfully',
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('[DEBUG] Error fetching course and upload status:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch course and upload status: ${error.message}`,
      statusCode: 500,
    });
  }
};
