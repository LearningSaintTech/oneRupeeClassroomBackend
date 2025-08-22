const Lesson = require('../../../course/models/lesson');
const Subcourse = require('../../../course/models/subcourse');
const Course = require('../../../course/models/course');
const { uploadImage, deleteImage } = require('../../../utils/s3Functions');
const { apiResponse } = require("../../../utils/apiResponse");
const mongoose = require('mongoose');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');

// Helper function to calculate duration in minutes
const calculateDurationInMinutes = (startTime, endTime) => {
    try {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            throw new Error('Invalid time format');
        }

        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);

        const startTotalMinutes = startHours * 60 + startMinutes;
        let endTotalMinutes = endHours * 60 + endMinutes;

        if (endTotalMinutes < startTotalMinutes) {
            endTotalMinutes += 24 * 60; // Add 24 hours
        }

        return endTotalMinutes - startTotalMinutes;
    } catch (error) {
        console.error('Error calculating duration:', error.message);
        return null;
    }
};

// Helper function to format duration as "Xh Ymin" or "Zmin"
const formatDuration = (minutes) => {
    if (minutes === null || isNaN(minutes)) return null;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${remainingMinutes}min`;
    }
    return `${minutes}min`;
};

// Helper function to parse formatted duration back to minutes
const parseDurationToMinutes = (durationStr) => {
    try {
        if (!durationStr) return 0;
        if (durationStr.includes('h')) {
            const [hoursPart, minutesPart] = durationStr.split('h').map(part => part.trim());
            const hours = parseInt(hoursPart) || 0;
            const minutes = parseInt(minutesPart.replace('min', '')) || 0;
            return hours * 60 + minutes;
        }
        return parseInt(durationStr.replace('min', '')) || 0;
    } catch (error) {
        console.error('Error parsing duration:', error.message);
        return 0;
    }
};

const generateThumbnail = async (videoBuffer, outputFileName) => {
    const tempVideoPath = path.join(__dirname, `temp_${Date.now()}_video.mp4`);
    const tempThumbnailPath = path.join(__dirname, `temp_${Date.now()}_thumbnail.jpg`);

    try {
        // Validate video buffer
        if (!Buffer.isBuffer(videoBuffer)) {
            throw new Error('Invalid video buffer');
        }

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
                .on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)));
        });

        // Read the generated thumbnail
        const thumbnailBuffer = await fs.readFile(tempThumbnailPath);

        // Upload thumbnail to S3
        const thumbnailFileName = `lessons/thumbnails/${Date.now()}_${outputFileName}.jpg`;
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


// Create a new lesson (POST)
exports.createLesson = async (req, res) => {
    try {
        const {
            courseId,
            subcourseId,
            lessonName,
            classLink,
            date,
            startTime,
            endTime,
            recordedVideoLink,
            description
        } = req.body;
        const introVideoFile = req.files?.introVideoUrl?.[0];

        console.log("Uploaded file:", { introVideoFile });

        // Validate required fields
        if (!courseId || !subcourseId || !lessonName || !date || !startTime || !endTime || !introVideoFile || !description) {
            return apiResponse(res, {
                success: false,
                message: 'All required fields must be provided',
                statusCode: 400,
            });
        }

        // Validate file properties
        if (!introVideoFile.buffer || !introVideoFile.mimetype || !introVideoFile.originalname) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid intro video file',
                statusCode: 400,
            });
        }

        // Validate courseId and subcourseId
        if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid course ID or subcourse ID',
                statusCode: 400,
            });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return apiResponse(res, {
                success: false,
                message: 'Course not found',
                statusCode: 404,
            });
        }

        // Check if subcourse exists and belongs to the course
        const subcourse = await Subcourse.findOne({ _id: subcourseId, courseId });
        if (!subcourse) {
            return apiResponse(res, {
                success: false,
                message: 'Subcourse not found or does not belong to the specified course',
                statusCode: 404,
            });
        }

        // Check if lesson with same name, courseId, and subcourseId already exists
        const existingLesson = await Lesson.findOne({ courseId, subcourseId, lessonName });
        if (existingLesson) {
            return apiResponse(res, {
                success: false,
                message: `Lesson '${lessonName}' already exists for this course and subcourse`,
                statusCode: 409,
            });
        }

        // Validate date and time formats
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid date format',
                statusCode: 400,
            });
        }
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
            return apiResponse(res, {
                success: false,
                message: 'Start time and end time must be in HH:MM format',
                statusCode: 400,
            });
        }

        // Calculate and format duration
        const durationInMinutes = calculateDurationInMinutes(startTime, endTime);
        if (durationInMinutes === null) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid lesson duration',
                statusCode: 400,
            });
        }
        const duration = formatDuration(durationInMinutes);

        // Upload intro video to S3
        const introVideoFileName = `lessons/videos/${Date.now()}_${introVideoFile.originalname}`;
        const introVideoUrl = await uploadImage(introVideoFile, introVideoFileName);

        // Generate thumbnail from intro video
        let thumbnailUrl;
        try {
            thumbnailUrl = await generateThumbnail(introVideoFile.buffer, `thumbnail_${lessonName}`);
        } catch (thumbnailError) {
            console.error('Thumbnail generation failed:', thumbnailError.message);
            return apiResponse(res, {
                success: false,
                message: `Failed to generate thumbnail: ${thumbnailError.message}`,
                statusCode: 500,
            });
        }

        // Create new lesson
        const lesson = new Lesson({
            adminId: req.userId,
            courseId,
            subcourseId,
            lessonName,
            classLink,
            date: parsedDate,
            startTime,
            endTime,
            recordedVideoLink,
            introVideoUrl,
            description,
            duration,
            thumbnailImageUrl: thumbnailUrl
        });

        await lesson.save();

        // Update subcourse totalDuration
        const currentTotalDuration = parseDurationToMinutes(subcourse.totalDuration);
        const newTotalDuration = currentTotalDuration + durationInMinutes;
        await Subcourse.updateOne(
            { _id: subcourseId },
            { $set: { totalDuration: formatDuration(newTotalDuration) } }
        );

        return apiResponse(res, {
            success: true,
            message: 'Lesson created successfully',
            data: lesson,
            statusCode: 201,
        });
    } catch (error) {
        console.error('Error creating lesson:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to create lesson: ${error.message}`,
            statusCode: 500,
        });
    }
};

// Get all lessons
exports.getAllLessons = async (req, res) => {
    try {
        let query = Lesson.find()
            .populate('courseId', 'courseName');

        if (mongoose.models.subcourse) {
            query = query.populate('subcourseId', 'subcourseName');
        } else {
            console.warn('subcourse model not registered, skipping subcourseId population');
        }

        const lessons = await query;

        const lessonsWithSNoAndDuration = lessons.map((lesson, index) => ({
            SNo: index + 1,
            _id: lesson._id,
            adminId: lesson.adminId,
            courseId: lesson.courseId,
            subcourseId: lesson.subcourseId,
            lessonName: lesson.lessonName,
            classLink: lesson.classLink,
            date: lesson.date,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            recordedVideoLink: lesson.recordedVideoLink,
            introVideoUrl: lesson.introVideoUrl,
            description: lesson.description,
            duration: lesson.duration
        }));

        return apiResponse(res, {
            success: true,
            message: 'Lessons retrieved successfully',
            data: lessonsWithSNoAndDuration,
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error fetching lessons:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to fetch lessons: ${error.message}`,
            statusCode: 500,
        });
    }
};

// Update a lesson (PUT)
exports.updateLesson = async (req, res) => {
    try {
        const lessonId = req.params.id;
        const {
            courseId,
            subcourseId,
            lessonName,
            classLink,
            date,
            startTime,
            endTime,
            recordedVideoLink,
            description
        } = req.body;
        const introVideoFile = req.files?.introVideoUrl?.[0];

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

        // Check authorization
        if (lesson.adminId.toString() !== req.userId) {
            return apiResponse(res, {
                success: false,
                message: 'Unauthorized to update this lesson',
                statusCode: 403,
            });
        }

        const oldSubcourseId = lesson.subcourseId;
        const oldDurationInMinutes = parseDurationToMinutes(lesson.duration);

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
            lesson.courseId = courseId;
        }

        // Validate subcourseId if provided
        if (subcourseId) {
            if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
                return apiResponse(res, {
                    success: false,
                    message: 'Invalid subcourse ID',
                    statusCode: 400,
                });
            }
            const subcourse = await Subcourse.findOne({ _id: subcourseId, courseId: lesson.courseId });
            if (!subcourse) {
                return apiResponse(res, {
                    success: false,
                    message: 'Subcourse not found or does not belong to the specified course',
                    statusCode: 404,
                });
            }
            lesson.subcourseId = subcourseId;
        }

        // Check for duplicate lessonName
        if (lessonName && lessonName !== lesson.lessonName) {
            const existingLesson = await Lesson.findOne({ courseId: lesson.courseId, subcourseId: lesson.subcourseId, lessonName });
            if (existingLesson) {
                return apiResponse(res, {
                    success: false,
                    message: `Lesson '${lessonName}' already exists for this course and subcourse`,
                    statusCode: 409,
                });
            }
            lesson.lessonName = lessonName;
        }

        // Update fields if provided
        if (classLink) lesson.classLink = classLink;
        if (description) lesson.description = description;
        if (date) {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                return apiResponse(res, {
                    success: false,
                    message: 'Invalid date format',
                    statusCode: 400,
                });
            }
            lesson.date = parsedDate;
        }
        if (startTime) {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(startTime)) {
                return apiResponse(res, {
                    success: false,
                    message: 'Start time must be in HH:MM format',
                    statusCode: 400,
                });
            }
            lesson.startTime = startTime;
        }
        if (endTime) {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(endTime)) {
                return apiResponse(res, {
                    success: false,
                    message: 'End time must be in HH:MM format',
                    statusCode: 400,
                });
            }
            lesson.endTime = endTime;
        }
        if (recordedVideoLink) lesson.recordedVideoLink = recordedVideoLink;

        // Update duration if startTime or endTime changed
        let newDurationInMinutes = oldDurationInMinutes;
        if (startTime || endTime) {
            newDurationInMinutes = calculateDurationInMinutes(lesson.startTime, lesson.endTime);
            if (newDurationInMinutes === null) {
                return apiResponse(res, {
                    success: false,
                    message: 'Invalid lesson duration',
                    statusCode: 400,
                });
            }
            lesson.duration = formatDuration(newDurationInMinutes);
        }

        // Update intro video if provided
        if (introVideoFile) {
            if (!introVideoFile.buffer || !introVideoFile.mimetype || !introVideoFile.originalname) {
                return apiResponse(res, {
                    success: false,
                    message: 'Invalid intro video file',
                    statusCode: 400,
                });
            }
            await deleteImage(lesson.introVideoUrl);
            const introVideoFileName = `lessons/videos/${Date.now()}_${introVideoFile.originalname}`;
            lesson.introVideoUrl = await uploadImage(introVideoFile, introVideoFileName);
        }

        await lesson.save();

        // Update subcourse totalDuration if startTime, endTime, or subcourseId changed
        if (startTime || endTime || subcourseId) {
            if (subcourseId && subcourseId !== oldSubcourseId.toString()) {
                // Subtract old duration from old subcourse
                const oldSubcourse = await Subcourse.findById(oldSubcourseId);
                if (oldSubcourse) {
                    const oldSubcourseTotal = parseDurationToMinutes(oldSubcourse.totalDuration);
                    await Subcourse.updateOne(
                        { _id: oldSubcourseId },
                        { $set: { totalDuration: formatDuration(Math.max(0, oldSubcourseTotal - oldDurationInMinutes)) } }
                    );
                }
                // Add new duration to new subcourse
                const newSubcourse = await Subcourse.findById(subcourseId);
                if (newSubcourse) {
                    const newSubcourseTotal = parseDurationToMinutes(newSubcourse.totalDuration);
                    await Subcourse.updateOne(
                        { _id: subcourseId },
                        { $set: { totalDuration: formatDuration(newSubcourseTotal + newDurationInMinutes) } }
                    );
                }
            } else {
                // Adjust current subcourse by the difference
                const durationDifference = newDurationInMinutes - oldDurationInMinutes;
                const subcourse = await Subcourse.findById(lesson.subcourseId);
                if (subcourse) {
                    const currentTotal = parseDurationToMinutes(subcourse.totalDuration);
                    await Subcourse.updateOne(
                        { _id: lesson.subcourseId },
                        { $set: { totalDuration: formatDuration(currentTotal + durationDifference) } }
                    );
                }
            }
        }

        return apiResponse(res, {
            success: true,
            message: 'Lesson updated successfully',
            data: lesson,
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error updating lesson:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to update lesson: ${error.message}`,
            statusCode: 500,
        });
    }
};

// Delete a lesson (DELETE)
exports.deleteLesson = async (req, res) => {
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

        // Check authorization
        if (lesson.adminId.toString() !== req.userId) {
            return apiResponse(res, {
                success: false,
                message: 'Unauthorized to delete this lesson',
                statusCode: 403,
            });
        }

        const subcourseId = lesson.subcourseId;
        const durationInMinutes = parseDurationToMinutes(lesson.duration);

        // Delete S3 introVideoUrl file
        if (lesson.introVideoUrl) {
            await deleteImage(lesson.introVideoUrl);
        }

        // Delete the lesson
        await Lesson.deleteOne({ _id: lessonId });

        // Update subcourse totalDuration
        const subcourse = await Subcourse.findById(subcourseId);
        if (subcourse) {
            const currentTotal = parseDurationToMinutes(subcourse.totalDuration);
            await Subcourse.updateOne(
                { _id: subcourseId },
                { $set: { totalDuration: formatDuration(Math.max(0, currentTotal - durationInMinutes)) } }
            );
        }

        return apiResponse(res, {
            success: true,
            message: 'Lesson deleted successfully',
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        return apiResponse(res, {
            success: false,
            message: `Failed to delete lesson: ${error.message}`,
            statusCode: 500,
        });
    }
};



exports.searchLessons = async (req, res) => {
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

    // Find lessons matching the search query
    const lessons = await Lesson.find({
      lessonName: searchRegex,
    })
      .populate('courseId', 'courseName')
      .populate('subcourseId', 'subcourseName')
      .sort({ createdAt: -1 });

    // Format results with SNo and relevant fields
    const lessonsWithSNo = lessons.map((lesson, index) => ({
      SNo: index + 1,
      lessonId: lesson._id,
      lessonName: lesson.lessonName,
      courseName: lesson.courseId?.courseName || 'N/A',
      subcourseName: lesson.subcourseId?.subcourseName || 'N/A',
      duration: lesson.duration,
    }));

    return apiResponse(res, {
      success: true,
      message: `Found ${lessonsWithSNo.length} lessons matching search query`,
      data: lessonsWithSNo,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error searching lessons:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error searching lessons',
      data: null,
      statusCode: 500,
    });
  }
};




exports.getLessonsBySubcourseId = async (req, res) => {
  try {
    const { subcourseId } = req.params;
    console.log(`Fetching lessons for subcourseId: ${subcourseId}`);

    // Validate subcourseId
    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`Invalid subcourse ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Check if subcourse exists
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log(`Subcourse not found for ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Fetch all lessons for the subcourse
    const lessons = await Lesson.find(
      { subcourseId: new mongoose.Types.ObjectId(subcourseId) },
      'lessonName duration'
    );

    // Handle case where no lessons are found
    if (!lessons.length) {
      console.log(`No lessons found for subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: true,
        message: 'No lessons available for this subcourse',
        data: [],
        statusCode: 200,
      });
    }

    // Add SNo to each lesson
    const lessonsWithSNo = lessons.map((lesson, index) => ({
      SNo: index + 1,
      _id: lesson._id,
      lessonName: lesson.lessonName,
      thumbnailImageUrl: lesson.thumbnailImageUrl,
      duration: lesson.duration,
      description:lesson.description
    }));

    return apiResponse(res, {
      success: true,
      message: 'Lessons retrieved successfully',
      data: lessonsWithSNo,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching lessons by subcourseId:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to fetch lessons: ${error.message}`,
      statusCode: 500,
    });
  }
};