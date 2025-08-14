const mongoose = require('mongoose');
const Subcourse = require('../../../course/models/subcourse'); 
const { apiResponse } = require('../../../utils/apiResponse');
const Lesson = require("../../../course/models/lesson");
const Course = require("../../../course/models/course");

// Get all subcourses with details
exports.getAllSubcourses = async (req, res) => {
  try {
    // Fetch only required fields from Subcourse collection
    const subcourses = await Subcourse.find({}, 'subcourseName thumbnailImageUrl totalLessons rating price');

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
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl,
      totalLessons: subcourse.totalLessons,
      rating: subcourse.rating,
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
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl,
      totalLessons: subcourse.totalLessons,
      rating: subcourse.rating,
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

        // Validate subcourseId
        if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid subcourse ID',
                statusCode: 400,
            });
        }

        // Fetch the top 5 subcourses by totalStudentsEnrolled to determine best sellers
        const topSubcourses = await Subcourse.aggregate([
            { $sort: { totalStudentsEnrolled: -1 } },
            { $limit: 5 },
            { $project: { totalStudentsEnrolled: 1 } }
        ]);

        // Extract the minimum totalStudentsEnrolled among the top 5
        const bestSellerThreshold = topSubcourses.length > 0 ? topSubcourses[topSubcourses.length - 1].totalStudentsEnrolled : 0;

        // Aggregation pipeline for the requested subcourse
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
                $group: {
                    _id: '$_id',
                    introVideoUrl: { $first: '$introVideoUrl' },
                    subcourseName: { $first: '$subcourseName' },
                    rating: { $first: '$rating' },
                    totalStudentsEnrolled: { $first: '$totalStudentsEnrolled' },
                    totalDuration: { $first: '$totalDuration' },
                    subCourseDescription: { $first: '$subCourseDescription' },
                    totalLessons: { $first: '$totalLessons' },
                    lessons: { $push: '$lessons' }
                }
            },
            {
                $project: {
                    introVideoUrl: 1,
                    subcourseName: 1,
                    rating: 1,
                    totalStudentsEnrolled: 1,
                    totalDuration: 1,
                    subCourseDescription: 1,
                    totalLessons: 1,
                    lessons: {
                        $cond: {
                            if: { $eq: [{ $size: '$lessons' }, 0] },
                            then: [],
                            else: {
                                $map: {
                                    input: '$lessons',
                                    as: 'lesson',
                                    in: {
                                        lessonName: '$$lesson.lessonName',
                                        thumbnailImageUrl: '$$lesson.thumbnailImageUrl',
                                        duration: '$$lesson.duration',
                                        startTime: '$$lesson.startTime',
                                        endTime: '$$lesson.endTime',
                                        date: '$$lesson.date'
                                    }
                                }
                            }
                        }
                    },
                    isBestSeller: {
                        $cond: {
                            if: { $gte: ['$totalStudentsEnrolled', bestSellerThreshold] },
                            then: true,
                            else: false
                        }
                    }
                }
            }
        ]).then(results => results[0]); // Get the first (and only) result

        if (!subcourse) {
            return apiResponse(res, {
                success: false,
                message: 'Subcourse not found',
                statusCode: 404,
            });
        }

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
        const lessonId = req.params.id;

        // Validate lessonId
        if (!mongoose.Types.ObjectId.isValid(lessonId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid lesson ID',
                statusCode: 400,
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

        // Get current date and time in IST
        const now = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const currentDateTime = new Date(now);
        const lessonDate = new Date(lesson.date);
        lessonDate.setHours(parseInt(lesson.startTime.split(':')[0]), parseInt(lesson.startTime.split(':')[1]), 0, 0);
        const lessonEndTime = new Date(lessonDate);
        lessonEndTime.setHours(parseInt(lesson.endTime.split(':')[0]), parseInt(lesson.endTime.split(':')[1]), 0, 0);

        // Update LiveStatus if current time is between startTime and endTime on the lesson date
        let liveStatus = lesson.LiveStatus;
        if (currentDateTime >= lessonDate && currentDateTime <= lessonEndTime) {
            liveStatus = true;
        }

        // Prepare response data
        const responseData = {
            introVideoUrl: lesson.introVideoUrl,
            lessonName:lesson.lessonName,
            classLink: lesson.classLink,
            desc: lesson.description,
            duration: lesson.duration,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            LiveStatus: liveStatus
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