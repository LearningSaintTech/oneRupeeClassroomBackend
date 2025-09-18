const mongoose = require('mongoose');
const crypto = require('crypto');
const InternshipLetter = require('../../../adminPanel/models/InternshipLetter/internshipLetter');
const Course = require('../../../adminPanel/models/course/course');
const razorpayInstance = require('../../../config/razorpay');
const UserAuth = require("../../models/Auth/Auth")
const { apiResponse } = require('../../../utils/apiResponse');
const UsermainCourse = require('../../models/UserCourse/usermainCourse');
const NotificationService = require("../../../Notification/controller/notificationServiceController")
const { emitRequestInternshipLetter } = require('../../../socket/emitters');

// Request Internship Letter and Create Razorpay Order
const requestInternshipLetter = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, courseId: ${courseId}`);

    // Validate courseId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`[DEBUG] Invalid courseId format: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      console.log(`[DEBUG] Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    // Check if user exists in UserAuth
    const user = await UserAuth.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for userId: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if user has completed the course
    const userCourse = await UsermainCourse.findOne({ userId, courseId });
    console.log(`[DEBUG] UsermainCourse data:`, userCourse);
    if (!userCourse || userCourse.status !== 'Course Completed' || !userCourse.isCompleted) {
      console.log(`[DEBUG] Course not completed or not enrolled - userId: ${userId}, courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'You must complete the course to request an internship letter',
        statusCode: 403,
      });
    }

    // Check for existing internship letter request
    let internshipLetter = await InternshipLetter.findOne({ userId, courseId });
    if (internshipLetter && internshipLetter.paymentStatus === true) {
      console.log(`[DEBUG] Payment already completed for internship letter - internshipLetterId: ${internshipLetter._id}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment already completed for this internship letter request',
        statusCode: 400,
      });
    }

    // Verify internship price
    if (!course.CourseInternshipPrice || course.CourseInternshipPrice <= 0) {
      console.log(`[DEBUG] Internship price not defined for courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Internship price not defined for this course',
        statusCode: 400,
      });
    }

    // Create Razorpay order
    const receipt = `r_${userId.toString().slice(0, 12)}_${Date.now().toString().slice(-8)}`;
    const orderOptions = {
      amount: course.CourseInternshipPrice * 100, // Convert to paise
      currency: 'INR',
      receipt: receipt,
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
    if (!razorpayOrder || !razorpayOrder.id) {
      console.log('[DEBUG] Failed to create Razorpay order');
      return apiResponse(res, {
        success: false,
        message: 'Failed to create Razorpay order',
        statusCode: 500,
      });
    }

    if (internshipLetter && internshipLetter.paymentStatus === false) {
      // Update existing internship letter request with new Razorpay order
      internshipLetter.razorpayOrderId = razorpayOrder.id;
      internshipLetter.paymentAmount = course.CourseInternshipPrice;
      internshipLetter.paymentCurrency = 'INR';
      internshipLetter.uploadStatus = 'upload';
      internshipLetter.updatedAt = new Date();

      await internshipLetter.save();
      console.log(`[DEBUG] Internship letter request updated - courseId: ${courseId}, razorpayOrderId: ${razorpayOrder.id}`);
    } else {
      // Create new internship letter request
      internshipLetter = new InternshipLetter({
        userId,
        courseId,
        paymentStatus: false,
        uploadStatus: 'upload',
        paymentAmount: course.CourseInternshipPrice,
        paymentCurrency: 'INR',
        razorpayOrderId: razorpayOrder.id,
      });

      await internshipLetter.save();
      console.log(`[DEBUG] Internship letter request created - courseId: ${courseId}, razorpayOrderId: ${razorpayOrder.id}`);
    }

    return apiResponse(res, {
      success: true,
      message: internshipLetter.isNew ? 'Internship letter request created successfully' : 'Internship letter request updated successfully',
      data: { internshipLetter, razorpayOrder },
      statusCode: 201,
    });
  } catch (error) {
    console.error('[DEBUG] Error requesting internship letter:', error);
    return apiResponse(res, {
      success: false,
      message: `Server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Verify and Update Payment Status
const updatePaymentStatus = async (req, res) => {
    try {
        const { internshipLetterId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
        const userId = req.userId;
        const io = req.app.get('io');

        // Validate internshipLetterId
        if (!mongoose.Types.ObjectId.isValid(internshipLetterId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid internship letter ID',
                statusCode: 400,
            });
        }

        // Find internship letter request
        const internshipLetter = await InternshipLetter.findOne({
            _id: internshipLetterId,
            userId,
        });

        if (!internshipLetter) {
            return apiResponse(res, {
                success: false,
                message: 'Internship letter request not found or unauthorized',
                statusCode: 404,
            });
        }

        // Verify payment signature
        const sign = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac("sha256", razorpayInstance.key_secret)
            .update(sign)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            return apiResponse(res, {
                success: false,
                message: 'Payment signature verification failed',
                statusCode: 400,
            });
        }

        // Update payment details
        internshipLetter.paymentStatus = true;
        internshipLetter.uploadStatus = 'upload';
        internshipLetter.razorpayOrderId = razorpayOrderId;
        internshipLetter.razorpayPaymentId = razorpayPaymentId;
        internshipLetter.razorpaySignature = razorpaySignature;
        internshipLetter.paymentDate = new Date();

        await internshipLetter.save();

        // Fetch courseName and userName
        const course = await Course.findById(internshipLetter.courseId).select('courseName');
        const user = await UserAuth.findById(userId).select('fullName');

        // Send notification to admins
        const notificationData = {
            senderId: userId,
            title: 'Internship Letter upload request',
            body: `Upload internship letter Course=${course.courseName},UserName=${user.fullName}`,
            type: 'internship_letter_payment',
            data: {
                internshipLetterId: internshipLetter._id,
                courseId: internshipLetter.courseId,
                userId: internshipLetter.userId,
                Status: internshipLetter.uploadStatus,
                PaymentStatus: internshipLetter.paymentStatus
            },
            createdAt: new Date(),
        };

        await NotificationService.sendAdminNotification(notificationData);

        // Emit request_internship_letter event
        if (io) {
            console.log('updatePaymentStatus: Emitting request_internship_letter event to user:', userId);
            emitRequestInternshipLetter(io, userId, {
                internshipLetterId: internshipLetter._id,
                courseId: internshipLetter.courseId,
                courseName: course.courseName,
                userId: internshipLetter.userId,
                userName: user.fullName,
                status: internshipLetter.uploadStatus,
                paymentStatus: internshipLetter.paymentStatus,
                paymentDate: internshipLetter.paymentDate,
                createdAt: new Date().toISOString()
            });
        } else {
            console.log('updatePaymentStatus: Socket.IO instance not found');
        }


        return apiResponse(res, {
            success: true,
            message: 'Payment verified and status updated successfully',
            data: internshipLetter,
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error updating payment status:', error.message);
        return apiResponse(res, {
            success: false,
            message: 'Server error',
            statusCode: 500,
        });
    }
};



//check internship-request status

const checkInternshipStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { courseId } = req.params; // Extract courseId from URL params

        // Validate courseId
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid course ID',
                statusCode: 400,
            });
        }

        // Check if internship letter request exists for the user and course
        const internshipLetter = await InternshipLetter.findOne({
            userId,
            courseId,
            paymentStatus:true
        });

        // If no internship letter request exists, return false for isEnrolled and null for uploadStatus
        if (!internshipLetter) {
            return apiResponse(res, {
                success: true,
                message: 'No internship letter request found',
                data: {
                    isEnrolled: false,
                    uploadStatus: null,
                    internshipLetter:""
                },
                statusCode: 200,
            });
        }

        // Return isEnrolled based on paymentStatus and include uploadStatus
        return apiResponse(res, {
            success: true,
            message: 'Internship status checked successfully',
            data: {
                isEnrolled: internshipLetter.paymentStatus === true,
                uploadStatus: internshipLetter.uploadStatus,
                internshipLetter:internshipLetter.internshipLetter
            },
            statusCode: 200,
        });

    } catch (error) {
        console.error('Error checking internship status:', error.message);
        return apiResponse(res, {
            success: false,
            message: 'Server error',
            statusCode: 500,
        });
    }
};



module.exports = {
    requestInternshipLetter,
    updatePaymentStatus,
    checkInternshipStatus
};