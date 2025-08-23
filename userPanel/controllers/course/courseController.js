const mongoose = require('mongoose');
const Subcourse = require('../../../course/models/subcourse');
const { apiResponse } = require('../../../utils/apiResponse');
const Lesson = require("../../../course/models/lesson");
const Course = require("../../../course/models/course");
const UserCourse = require("../../models/UserCourse/userCourse");
const User = require("../../models/Auth/Auth");
const UserProfile = require("../../models/Profile/userProfile");
const userLesson = require("../../models/UserCourse/userLesson");
const Promo = require("../../../Promo/models/promo");
const subcourse = require('../../../course/models/subcourse');
const UsermainCourse = require("../../models/UserCourse/usermainCourse");

// Get all subcourses with details
exports.getAllSubcourses = async (req, res) => {
  try {
    const userId = req.userId; // Assuming user ID is available from JWT middleware
    console.log(`Fetching subcourses for userId: ${userId}`);

    let subcourses = [];

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Valid userId: ${userId}, checking purchasedsubCourses...`);
      const user = await User.findById(userId).select('purchasedsubCourses');
      if (user) {
        console.log(`User found with purchasedsubCourses: ${user.purchasedsubCourses}`);
        subcourses = await Subcourse.find(
          { _id: { $nin: user.purchasedsubCourses || [] } },
          'subcourseName thumbnailImageUrl totalLessons avgRating price'
        );
        console.log(`Found ${subcourses.length} subcourses where courseId is not in purchasedsubCourses`);
      } else {
        console.log(`User not found for ID: ${userId}, fetching all subcourses...`);
        subcourses = await Subcourse.find({}, 'subcourseName thumbnailImageUrl totalLessons avgRating price');
      }
    } else {
      console.log(`Invalid or missing userId: ${userId}, fetching all subcourses...`);
      subcourses = await Subcourse.find({}, 'subcourseName thumbnailImageUrl totalLessons avgRating price');
    }

    if (!subcourses.length) {
      console.log('No subcourses available after filtering');
      return apiResponse(res, {
        success: true,
        message: 'No subcourses available',
        data: [],
        statusCode: 200,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Subcourses retrieved successfully',
      data: subcourses,
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
//get popular courses 

exports.getPopularCourses = async (req, res) => {
  try {
    const subcourses = await Subcourse.find()
      .sort({ totalStudentsEnrolled: -1 }); // Descending order

    const popularCourses = subcourses.map(subcourse => ({
      _id:subcourse._id,
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl,
      totalLessons: subcourse.totalLessons,
      avgRating: subcourse.avgRating,
      totalStudentsEnrolled: subcourse.totalStudentsEnrolled,
      price: subcourse.price
    }));

    return apiResponse(res, {
      success: true,
      message: 'Popular courses retrieved successfully',
      data: popularCourses,
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

//get newest courses

exports.getNewestCourses = async (req, res) => {
  try {
    const subcourses = await Subcourse.find()
      .sort({ createdAt: -1 }); // Descending order (newest first)

    const newestCourses = subcourses.map(subcourse => ({
      _id:subcourse._id,
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl,
      totalLessons: subcourse.totalLessons,
      avgRating: subcourse.avgRating,
      price: subcourse.price
    }));

    return apiResponse(res, {
      success: true,
      message: 'Newest courses retrieved successfully',
      data: newestCourses,
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
          lessons: 1,
          isBestSeller: {
            $cond: {
              if: { $gte: ['$totalStudentsEnrolled', bestSellerThreshold] },
              then: true,
              else: false
            }
          },
          paymentStatus: { $literal: paymentStatus },
          isCompleted: { $literal: subcourseCompleted } // Add subcourse completion status
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
//get lesson by Id
exports.getLessonById = async (req, res) => {
  try {
    const userId = req.userId;
    const lessonId = req.params.id;

    // Validate lessonId and userId
    if (!mongoose.Types.ObjectId.isValid(lessonId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid lesson ID or user ID',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Find lesson
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return apiResponse(res, {
        success: false,
        message: 'Lesson not found',
        statusCode: 404,
      });
    }

    // Check if user has purchased the subcourse associated with the lesson
    if (!user.purchasedsubCourses.includes(lesson.subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Access denied: Subcourse not purchased',
        statusCode: 403,
      });
    }

    // Get current date and time in IST
    const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const currentDateTime = new Date(now);

    // Set lesson start and end times
    const lessonDate = new Date(lesson.date);
    lessonDate.setHours(parseInt(lesson.startTime.split(':')[0]), parseInt(lesson.startTime.split(':')[1]), 0, 0);
    const lessonEndTime = new Date(lessonDate);
    lessonEndTime.setHours(parseInt(lesson.endTime.split(':')[0]), parseInt(lesson.endTime.split(':')[1]), 0, 0);

    // Determine live status
    const isLive = currentDateTime >= lessonDate && currentDateTime <= lessonEndTime;

    // Prepare response data
    const responseData = {
      introVideoUrl: lesson.introVideoUrl,
      lessonName: lesson.lessonName,
      classLink: lesson.classLink,
      recordedVideoLink: lesson.recordedVideoLink,
      date: lesson.date,
      desc: lesson.description,
      duration: lesson.duration,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      LiveStatus: isLive,
    };

    return apiResponse(res, {
      success: true,
      message: 'Lesson details retrieved successfully',
      data: responseData,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching lesson by ID:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch lesson: ${error.message}`,
      statusCode: 500,
    });
  }
};

//get-all-courses
exports.getAllCourses = async (req, res) => {
  try {
    // Aggregate courses with total subcourses count
    const courses = await Course.aggregate([
      {
        $lookup: {
          from: 'subcourses', // Collection name for Subcourse model
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
      }
    ]);

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
      data: courses,
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

    // Fetch purchased subcourses with required fields
    const subcourses = await Subcourse.find({
      _id: { $in: user.purchasedsubCourses },
    }).select('subcourseName totalLessons thumbnailImageUrl');

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
      data: result,
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

    // Find users who have purchased the subcourse
    const users = await User.find({
      purchasedsubCourses: subcourseId,
    }).select('fullName');

    // If no users have purchased the subcourse, return empty array
    if (!users || users.length === 0) {
      return apiResponse(res, {
        success: true,
        message: 'No users enrolled in this subcourse',
        data: [],
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
      data: result,
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

    // Fetch subcourses with thumbnail, price, totalLessons, isLike, and avgRating
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
      }
    ]);

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
        isCourseCompleted, // Added isCompleted flag
        subcourses
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
      recentPurchasedSubcourse = await UserCourse.findOne(
        { userId, isCompleted: false, paymentStatus: true },
        'subcourseId progress'
      )
        .populate({
          path: 'subcourseId',
          select: 'subcourseName thumbnailImageUrl totalLessons'
        })
        .sort({ paymentDate: -1 });

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



exports.getSubcourseNameAndCertDesc = async (req, res) => {
  try {
    const { subcourseId } = req.params;
    console.log(`Fetching subcourse name and certificate description for subcourseId: ${subcourseId}`);

    // Validate subcourseId
    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`Invalid subcourse ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Fetch the subcourse with only subcourseName and certificateDescription
    const subcourse = await Subcourse.findById(
      subcourseId,
      'subcourseName certificateDescription'
    );

    // Handle case where subcourse is not found
    if (!subcourse) {
      console.log(`Subcourse not found for ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Subcourse retrieved successfully',
      data: subcourse,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching subcourse:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch subcourse: ${error.message}`,
      statusCode: 500,
    });
  }
};




exports.getCourseNameAndDesc = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(`Fetching course name and description for courseId: ${courseId}`);

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`Invalid course ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Fetch the course with only courseName and courseDescription
    const course = await Course.findById(
      courseId,
      'courseName certificateDescription'
    );

    // Handle case where course is not found
    if (!course) {
      console.log(`Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Course retrieved successfully',
      data: course,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch course: ${error.message}`,
      statusCode: 500,
    });
  }
};