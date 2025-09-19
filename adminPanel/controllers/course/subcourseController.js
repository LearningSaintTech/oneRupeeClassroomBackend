const Subcourse = require('../../models/course/subcourse');
const Course = require('../../models/course/course');
const Lesson = require("../../models/course/lesson");
const { uploadImage, deleteImage } = require('../../../utils/s3Functions');
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require('mongoose');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs').promises;
const path = require('path');

// Set FFmpeg path programmatically
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const generateThumbnail = async (videoBuffer, outputFileName) => {
    const tempVideoPath = path.join(__dirname, `temp_${Date.now()}_video.mp4`);
    const tempThumbnailPath = path.join(__dirname, `temp_${Date.now()}_thumbnail.jpg`);

    try {
        // Write video buffer to temporary file
        await fs.writeFile(tempVideoPath, videoBuffer);

        // Generate thumbnail using fluent-ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(tempVideoPath)
                .screenshots({
                    count: 1,
                    folder: path.dirname(tempThumbnailPath),
                    filename: path.basename(tempThumbnailPath),
                    size: '320x240', // Thumbnail size
                    timestamps: ['2'], // Take screenshot at 1 second
                })
                .on('end', resolve)
                .on('error', reject);
        });

        // Read the generated thumbnail
        const thumbnailBuffer = await fs.readFile(tempThumbnailPath);

        // Upload thumbnail to S3
        const thumbnailFileName = `subcourses/thumbnails/${Date.now()}_${outputFileName}.jpg`;
        const thumbnailUrl = await uploadImage({ buffer: thumbnailBuffer, mimetype: 'image/jpeg', originalname: `${outputFileName}.jpg` }, thumbnailFileName);

        return thumbnailUrl;
    } catch (error) {
        throw new Error(`Failed to generate thumbnail: ${error.message}`);
    } finally {
        // Clean up temporary files
        try {
            await fs.unlink(tempVideoPath).catch(() => {});
            await fs.unlink(tempThumbnailPath).catch(() => {});
        } catch (cleanupError) {
            console.error('Error cleaning up temporary files:', cleanupError.message);
        }
    }
};

// Create a new subcourse (POST)
exports.createSubcourse = async (req, res) => {
    try {
        const {
            courseId,
            subcourseName,
            subCourseDescription,
            price,
            certificatePrice,
            certificateDescription,
            totalLessons,
            totalDuration,
            isUpComingCourse
        } = req.body;
        const introVideoFile = req.files?.introVideoUrl?.[0];

        console.log("Uploaded files:", { introVideoFile });

        // Validate required fields
        if (!courseId || !subcourseName || !subCourseDescription || !certificatePrice || !certificateDescription || !introVideoFile || !totalLessons) {
            return apiResponse(res, {
                success: false,
                message: 'All required fields must be provided',
                statusCode: 400,
            });
        }

        // Validate courseId
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid course ID',
                statusCode: 400,
            });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return apiResponse(res, {
                success: false,
                message: 'Course not found',
                statusCode: 404
            });
        }

        // Check if subcourse with same name and courseId already exists
        const existingSubcourse = await Subcourse.findOne({ courseId, subcourseName });
        if (existingSubcourse) {
            return apiResponse(res, {
                success: false,
                message: `Subcourse '${subcourseName}' already exists for this course`,
                statusCode: 409,
            });
        }

        // Upload intro video to S3
        const introVideoFileName = `subcourses/videos/${Date.now()}_${introVideoFile.originalname}`;
        const introVideoUrl = await uploadImage(introVideoFile, introVideoFileName);

        // Generate thumbnail from intro video
        const thumbnailUrl = await generateThumbnail(introVideoFile.buffer, `thumbnail_${subcourseName}`);

        // Create new subcourse
        const subcourse = new Subcourse({
            adminId: req.userId, // From auth middleware
            courseId,
            subcourseName,
            subCourseDescription,
            price: price || 1,
            certificatePrice,
            certificateDescription,
            introVideoUrl,
            totalLessons,
            totalDuration,
            thumbnailImageUrl: thumbnailUrl,
            isUpComingCourse: isUpComingCourse || false
        });

        await subcourse.save();

        return apiResponse(res, {
            success: true,
            message: 'Subcourse created successfully',
            data: subcourse,
            statusCode: 201,
        });
    } catch (error) {
        console.error('Error creating subcourse:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to create subcourse: ${error.message}`,
            statusCode: 500,
        });
    }
};

// Get all subcourses 
exports.getAllSubcourses = async (req, res) => {
    try {
        const subcourses = await Subcourse.find()
            .populate('courseId', 'courseName');

        // Add SNo to each subcourse
        const subcoursesWithSNo = subcourses.map((subcourse, index) => ({
            SNo: index + 1,
            _id: subcourse._id,
            adminId: subcourse.adminId,
            courseId: subcourse.courseId,
            subcourseName: subcourse.subcourseName,
            subCourseDescription: subcourse.subCourseDescription,
            price: subcourse.price,
            certificatePrice: subcourse.certificatePrice,
            certificateDescription: subcourse.certificateDescription,
            introVideoUrl: subcourse.introVideoUrl,
            totalLessons: subcourse.totalLessons,
            totalDuration: subcourse.totalDuration,
            thumbnailImageUrl: subcourse.thumbnailImageUrl,
            isUpComingCourse:subcourse.isUpComingCourse
        }));

        return apiResponse(res, {
            success: true,
            message: 'Subcourses retrieved successfully',
            data: subcoursesWithSNo,
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

// Update a subcourse (PUT)
exports.updateSubcourse = async (req, res) => {
    try {
        const subcourseId = req.params.id;
        const {
            courseId,
            subcourseName,
            subCourseDescription,
            price,
            certificatePrice,
            certificateDescription,
            totalLessons,
            isUpComingCourse
        } = req.body;

        const introVideoFile = req.files?.introVideoUrl?.[0];
        console.log("Uploaded files:", { introVideoFile });

        // Validate subcourseId
        if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid subcourse ID',
                statusCode: 400,
            });
        }

        // Find subcourse
        const subcourse = await Subcourse.findById(subcourseId);
        if (!subcourse) {
            return apiResponse(res, {
                success: false,
                message: 'Subcourse not found',
                statusCode: 404,
            });
        }

        // // Check admin authorization
        // if (subcourse.adminId.toString() !== req.userId) {
        //     return apiResponse(res, {
        //         success: false,
        //         message: 'Unauthorized to update this subcourse',
        //         statusCode: 403,
        //     });
        // }

        // Validate courseId if provided
        if (courseId) {
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
            subcourse.courseId = courseId;
        }

        // Update fields if provided
        if (subcourseName) subcourse.subcourseName = subcourseName;
        if (subCourseDescription) subcourse.subCourseDescription = subCourseDescription;
        if (price) subcourse.price = price;
        if (certificatePrice) subcourse.certificatePrice = certificatePrice;
        if (certificateDescription) subcourse.certificateDescription = certificateDescription;
        if (totalLessons) subcourse.totalLessons = totalLessons;
        if (isUpComingCourse !== undefined) subcourse.isUpComingCourse = isUpComingCourse;

        // Update intro video if new file is provided
        if (introVideoFile) {
            await deleteImage(subcourse.introVideoUrl);
            const introVideoFileName = `subcourses/videos/${Date.now()}_${introVideoFile.originalname}`;
            subcourse.introVideoUrl = await uploadImage(introVideoFile, introVideoFileName);

            // Regenerate thumbnail
            const thumbnailUrl = await generateThumbnail(introVideoFile.buffer, `thumbnail_${subcourseName}`);
            subcourse.thumbnailImageUrl = thumbnailUrl;
        }

        await subcourse.save();

        return apiResponse(res, {
            success: true,
            message: 'Subcourse updated successfully',
            data: subcourse,
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error updating subcourse:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to update subcourse: ${error.message}`,
            statusCode: 500,
        });
    }
};

// Delete a subcourse
exports.deleteSubcourse = async (req, res) => {
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

        // Find subcourse
        const subcourse = await Subcourse.findById(subcourseId);
        if (!subcourse) {
            return apiResponse(res, {
                success: false,
                message: 'Subcourse not found',
                statusCode: 404,
            });
        }

        // Check admin authorization
        if (subcourse.adminId.toString() !== req.userId) {
            return apiResponse(res, {
                success: false,
                message: 'Unauthorized to delete this subcourse',
                statusCode: 403,
            });
        }

        // Delete associated lessons and their S3 introVideoUrl files
        const lessons = await Lesson.find({ subcourseId });
        for (const lesson of lessons) {
            if (lesson.introVideoUrl) {
                await deleteImage(lesson.introVideoUrl);
            }
        }
        await Lesson.deleteMany({ subcourseId });

        // Delete subcourse's S3 files
        if (subcourse.introVideoUrl) {
            await deleteImage(subcourse.introVideoUrl);
        }

        // Delete the subcourse
        await Subcourse.deleteOne({ _id: subcourseId });

        return apiResponse(res, {
            success: true,
            message: 'Subcourse and associated lessons deleted successfully',
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error deleting subcourse:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to delete subcourse: ${error.message}`,
            statusCode: 500,
        });
    }
};

// Search subcourses
exports.searchSubcourses = async (req, res) => {
  try {
    const { q } = req.query;

    // Validate search query
    if (!q || typeof q !== 'string') {
      return apiResponse(res, {
        success: false,
        message: 'Search query is required and must be a string',
        data: null,
        statusCode: 400,
      });
    }

    // Create search regex for case-insensitive partial matching
    const searchRegex = new RegExp(q.trim(), 'i');

    // Find subcourses matching the search query
    const subcourses = await Subcourse.find({
      subcourseName: searchRegex,
    })
      .populate('courseId', 'courseName')
      .sort({ createdAt: -1 });

    // Format results with SNo and relevant fields
    const subcoursesWithSNo = subcourses.map((subcourse, index) => ({
      SNo: index + 1,
      subcourseId: subcourse._id,
      subcourseName: subcourse.subcourseName,
      courseName: subcourse.courseId?.courseName || 'N/A',
      subCourseDescription: subcourse.subCourseDescription,
      price: subcourse.price,
      certificatePrice: subcourse.certificatePrice,
      certificateDescription: subcourse.certificateDescription,
      introVideoUrl: subcourse.introVideoUrl,
      totalLessons: subcourse.totalLessons,
      totalDuration: subcourse.totalDuration,
      thumbnailImageUrl: subcourse.thumbnailImageUrl,
    }));

    return apiResponse(res, {
      success: true,
      message: `Found ${subcoursesWithSNo.length} subcourses matching search query`,
      data: subcoursesWithSNo,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error searching subcourses:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error searching subcourses',
      data: null,
      statusCode: 500,
    });
  }
};



exports.getSubcoursesByCourseId = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(`Fetching subcourses for courseId: ${courseId}`);

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`Invalid course ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      console.log(`Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    // Fetch all subcourses for the course
    const subcourses = await Subcourse.find(
      { courseId: new mongoose.Types.ObjectId(courseId) },
      'subcourseName thumbnailImageUrl price subCourseDescription totalDuration isUpComingCourse'
    );

    // Handle case where no subcourses are found
    if (!subcourses.length) {
      console.log(`No subcourses found for courseId: ${courseId}`);
      return apiResponse(res, {
        success: true,
        message: 'No subcourses available for this course',
        data: [],
        statusCode: 200,
      });
    }

    // Add SNo to each subcourse
    const subcoursesWithSNo = subcourses.map((subcourse, index) => ({
      SNo: index + 1,
      _id: subcourse._id,
      subcourseName: subcourse.subcourseName,
      thumbnailImageUrl: subcourse.thumbnailImageUrl,
      totalLessons: subcourse.totalLessons,
      price: subcourse.price,
      avgRating: subcourse.avgRating,
      subCourseDescription: subcourse.subCourseDescription,
      totalDuration:subcourse.totalDuration,
      isUpComingCourse:subcourse.isUpComingCourse
    }));

    return apiResponse(res, {
      success: true,
      message: 'Subcourses retrieved successfully',
      data: subcoursesWithSNo,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching subcourses by courseId:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch subcourses: ${error.message}`,
      statusCode: 500,
    });
  }
};