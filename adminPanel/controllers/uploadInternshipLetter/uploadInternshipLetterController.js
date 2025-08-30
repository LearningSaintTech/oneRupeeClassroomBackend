const mongoose = require('mongoose');
const InternshipLetter = require('../../models/InternshipLetter/internshipLetter');
const Course = require('../../models/course/course');
const { apiResponse } = require('../../../utils/apiResponse');
const { uploadImage } = require('../../../utils/s3Functions');
const path = require('path');
const NotificationService = require('../../../Notification/controller/notificationServiceController');
const Admin = require('../../models/Auth/auth');
const { emitUploadInternshipLetter } = require('../../../socket/emitters');

// Upload Internship Letter and Update Status
exports.uploadInternshipLetter = async (req, res) => {
  try {
    const { internshipLetterId } = req.body;
    const adminId = req.userId;
    const io = req.app.get('io');
    console.log('🔔 [uploadInternshipLetter] Request received:', {
      internshipLetterId,
      adminId,
      timestamp: new Date().toISOString(),
    });

    const file = req.file;

    // Validate internshipLetterId
    if (!mongoose.Types.ObjectId.isValid(internshipLetterId)) {
      console.log('🔔 [uploadInternshipLetter] Invalid internship letter ID');
      return apiResponse(res, {
        success: false,
        message: 'Invalid internship letter ID',
        statusCode: 400,
      });
    }

    // Validate adminId
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      console.log('🔔 [uploadInternshipLetter] Invalid admin ID');
      return apiResponse(res, {
        success: false,
        message: 'Invalid admin ID',
        statusCode: 400,
      });
    }

    // Check if admin exists
    const admin = await Admin.findById(adminId);
    if (!admin) {
      console.log('🔔 [uploadInternshipLetter] Admin not found:', { adminId });
      return apiResponse(res, {
        success: false,
        message: 'Admin not found',
        statusCode: 404,
      });
    }

    // Find internship letter request
    const internshipLetter = await InternshipLetter.findById(internshipLetterId);
    if (!internshipLetter) {
      console.log('🔔 [uploadInternshipLetter] Internship letter request not found');
      return apiResponse(res, {
        success: false,
        message: 'Internship letter request not found',
        statusCode: 404,
      });
    }

    // Check if payment is completed
    if (!internshipLetter.paymentStatus) {
      console.log('🔔 [uploadInternshipLetter] Payment not completed');
      return apiResponse(res, {
        success: false,
        message: 'Payment must be completed before uploading the internship letter',
        statusCode: 403,
      });
    }

    // Check if file is provided
    if (!file) {
      console.log('🔔 [uploadInternshipLetter] No file provided');
      return apiResponse(res, {
        success: false,
        message: 'No file provided for upload',
        statusCode: 400,
      });
    }

    // Generate unique filename for S3
    const fileExtension = path.extname(file.originalname);
    const fileName = `internship-letters/${internshipLetterId}-${Date.now()}${fileExtension}`;

    // Upload file to S3
    const fileUrl = await uploadImage(file, fileName);
    console.log('🔔 [uploadInternshipLetter] File uploaded to S3:', { fileUrl });

    // Update internship letter with file URL and status
    internshipLetter.internshipLetter = fileUrl;
    internshipLetter.uploadStatus = 'uploaded';
    await internshipLetter.save();
    console.log('🔔 [uploadInternshipLetter] Internship letter updated:', {
      internshipLetterId,
      uploadStatus: internshipLetter.uploadStatus,
    });

    // Fetch course details for notification
    let courseTitle = internshipLetter.courseId.toString();
    try {
      const course = await Course.findById(internshipLetter.courseId).select('title');
      if (course) {
        courseTitle = course.title;
      } else {
        console.log('🔔 [uploadInternshipLetter] Course not found, using courseId:', {
          courseId: internshipLetter.courseId,
        });
      }
    } catch (courseError) {
      console.error('🔔 [uploadInternshipLetter] Error fetching course:', courseError);
    }

    // Send notification to user
    try {
      const notificationData = {
        recipientId: internshipLetter.userId,
        senderId: adminId,
        title: 'Internship Letter Ready for Download',
        body: `Your internship letter for the course ${courseTitle} has been uploaded and is ready for download.`,
        type: 'internship_letter_uploaded',
        data: {
          internshipLetterId: internshipLetter._id,
          courseId: internshipLetter.courseId,
          userId: internshipLetter.userId,
        },
        createdAt: new Date(),
      };

      await NotificationService.createAndSendNotification(notificationData);
      console.log('🔔 [uploadInternshipLetter] User notification sent successfully:', {
        userId: internshipLetter.userId,
        internshipLetterId,
        senderId: adminId,
        courseTitle,
      });

      // Emit upload_internship_letter event
      if (io) {
        console.log('uploadInternshipLetter: Emitting upload_internship_letter event to user:', internshipLetter.userId);
        emitUploadInternshipLetter(io, internshipLetter.userId, notificationData);
      } else {
        console.log('uploadInternshipLetter: Socket.IO instance not found');
      }
    } catch (notificationError) {
      console.error('🔔 [uploadInternshipLetter] Failed to send user notification:', notificationError);
    }

    return apiResponse(res, {
      success: true,
      message: 'Internship letter uploaded and status updated successfully',
      data: internshipLetter.internshipLetter,
      statusCode: 200,
    });
  } catch (error) {
    console.error('🔔 [uploadInternshipLetter] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to upload internship letter: ${error.message}`,
      statusCode: 500,
    });
  }
};