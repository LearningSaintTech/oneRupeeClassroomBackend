const Subcourse = require('../../../course/models/subcourse');
const Course = require('../../../course/models/course');
const Lesson = require("../../../course/models/lesson");
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
            totalDuration
        } = req.body;
        const certificateFile = req.files?.certificateUrl?.[0];
        const introVideoFile = req.files?.introVideoUrl?.[0];

        console.log("Uploaded files:", { certificateFile, introVideoFile });

        // Validate required fields
        if (!courseId || !subcourseName || !subCourseDescription || !certificateFile || !certificatePrice || !certificateDescription || !introVideoFile || !totalLessons) {
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

        // Upload certificate and intro video to S3
        const certificateFileName = `subcourses/certificates/${Date.now()}_${certificateFile.originalname}`;
        const introVideoFileName = `subcourses/videos/${Date.now()}_${introVideoFile.originalname}`;

        const certificateUrl = await uploadImage(certificateFile, certificateFileName);
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
            certificateUrl,
            certificatePrice,
            certificateDescription,
            introVideoUrl,
            totalLessons,
            totalDuration,
            thumbnailImageUrl: thumbnailUrl
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
            certificateUrl: subcourse.certificateUrl,
            certificatePrice: subcourse.certificatePrice,
            certificateDescription: subcourse.certificateDescription,
            introVideoUrl: subcourse.introVideoUrl,
            totalLessons: subcourse.totalLessons,
            duration:subcourse.totalDuration
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
        } = req.body;
        const certificateFile = req.files?.certificate;
        const introVideoFile = req.files?.introVideo;

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
                message: 'Unauthorized to update this subcourse',
                statusCode: 403,
            });
        }

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

        // Update certificate if new file is provided
        if (certificateFile) {
            await deleteImage(subcourse.certificateUrl);
            const certificateFileName = `subcourses/certificates/${Date.now()}_${certificateFile.originalname}`;
            subcourse.certificateUrl = await uploadImage(certificateFile, certificateFileName);
        }

        // Update intro video if new file is provided
        if (introVideoFile) {
            await deleteImage(subcourse.introVideoUrl);
            const introVideoFileName = `subcourses/videos/${Date.now()}_${introVideoFile.originalname}`;
            subcourse.introVideoUrl = await uploadImage(introVideoFile, introVideoFileName);
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


//delete a subcourse
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
        if (subcourse.certificateUrl) {
            await deleteImage(subcourse.certificateUrl);
        }
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