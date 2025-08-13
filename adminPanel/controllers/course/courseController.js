const Course = require('../../../course/models/course'); 
const { uploadImage, deleteImage } = require('../../../utils/s3Functions');
const Lesson = require("../../../course/models/lesson");
const Subcourse = require("../../../course/models/subcourse");
const { apiResponse} = require("../../../utils/apiResponse");
const mongoose = require('mongoose');

// Create a new course 
exports.createCourse = async (req, res) => {
  try {
    const adminId = req.userId
    const { courseName } = req.body;
    const file = req.file;

    if (!courseName || !file) {
      return apiResponse(res, {
        success: false,
        message: 'Course name and cover image are required',
        statusCode: 400,
      });
    }

    // Generate unique filename for the image
    const fileName = `courses/coverImage/${Date.now()}_${file.originalname}`;
    
    // Upload image to S3
    const coverImageUrl = await uploadImage(file, fileName);

    // Create new course
    const course = new Course({
      adminId,
      courseName,
      CoverImageUrl: coverImageUrl,
    });

    await course.save();

    return apiResponse(res, {
      success: true,
      message: 'Course created successfully',
      data: course,
      statusCode: 201,
    });
  } catch (error) {
    console.error('Error creating course:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to create course: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find();
    
    // Add SNo to each course
    const coursesWithSNo = courses.map((course, index) => ({
      SNo: index + 1,
      _id: course._id,
      courseName: course.courseName,
      CoverImageUrl: course.CoverImageUrl
    }));

    return apiResponse(res, {
      success: true,
      message: 'Courses retrieved successfully',
      data: coursesWithSNo,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch courses: ${error.message}`,
      statusCode: 500,
    });
  }
};



// Update a course
exports.updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { courseName } = req.body;
    const file = req.file;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    const course = await Course.findById(courseId);

    if (!course) {
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    // Update course name if provided
    if (courseName) {
      course.courseName = courseName;
    }

    // Update cover image if new file is provided
    if (file) {
      // Delete old image from S3
      await deleteImage(course.CoverImageUrl);

      // Upload new image
      const fileName = `courses/${Date.now()}_${file.originalname}`;
      const newCoverImageUrl = await uploadImage(file, fileName);
      course.CoverImageUrl = newCoverImageUrl;
    }

    await course.save();

    return apiResponse(res, {
      success: true,
      message: 'Course updated successfully',
      data: course,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating course:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to update course: ${error.message}`,
      statusCode: 500,
    });
  }
};

//delete a course
exports.deleteCourse = async (req, res) => {
    try {
        const courseId = req.params.id;

        // Validate courseId
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid course ID',
                statusCode: 400,
            });
        }

        // Find course
        const course = await Course.findById(courseId);
        if (!course) {
            return apiResponse(res, {
                success: false,
                message: 'Course not found',
                statusCode: 404,
            });
        }

        // Check admin authorization
        if (course.adminId.toString() !== req.userId) {
            return apiResponse(res, {
                success: false,
                message: 'Unauthorized to delete this course',
                statusCode: 403,
            });
        }

        // Find all subcourses for this course
        const subcourses = await Subcourse.find({ courseId });

        // Delete associated lessons and their S3 introVideoUrl files
        for (const subcourse of subcourses) {
            const lessons = await Lesson.find({ subcourseId: subcourse._id });
            for (const lesson of lessons) {
                if (lesson.introVideoUrl) {
                    await deleteImage(lesson.introVideoUrl);
                }
            }
            await Lesson.deleteMany({ subcourseId: subcourse._id });

            // Delete subcourse's S3 files
            if (subcourse.certificateUrl) {
                await deleteImage(subcourse.certificateUrl);
            }
            if (subcourse.introVideoUrl) {
                await deleteImage(subcourse.introVideoUrl);
            }
        }

        // Delete all subcourses for this course
        await Subcourse.deleteMany({ courseId });

        // Delete the course
        await Course.deleteOne({ _id: courseId });

        return apiResponse(res, {
            success: true,
            message: 'Course and associated subcourses and lessons deleted successfully',
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error deleting course:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to delete course: ${error.message}`,
            statusCode: 500,
        });
    }
};