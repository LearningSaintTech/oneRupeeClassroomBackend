const mongoose = require('mongoose');
const crypto = require('crypto');
const InternshipLetter = require('../../../adminPanel/models/InternshipLetter/internshipLetter');
const Course = require('../../../adminPanel/models/course/course');
const razorpayInstance = require('../../../config/razorpay');
const UserAuth = require("../../models/Auth/Auth")
const { apiResponse } = require('../../../utils/apiResponse');
const UsermainCourse = require('../../models/UserCourse/usermainCourse');
const NotificationService = require("../../../Notification/controller/notificationServiceController")

// Request Internship Letter and Create Razorpay Order
const requestInternshipLetter = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.userId

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
                statusCode: 404,
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

        // Check if user has completed the course
        const userCourse = await UsermainCourse.findOne({ userId, courseId });
        if (!userCourse || userCourse.status !== 'Course Completed' || !userCourse.isCompleted) {
            return apiResponse(res, {
                success: false,
                message: 'You must complete the course to request an internship letter',
                statusCode: 403,
            });
        }

        // Check if internship letter request already exists
        const existingRequest = await InternshipLetter.findOne({ userId, courseId });
        if (existingRequest) {
            return apiResponse(res, {
                success: false,
                message: 'Internship letter request already exists',
                statusCode: 400,
            });
        }


        // Create Razorpay order with a shorter receipt
        const receipt = `r_${userId.toString().slice(0, 12)}_${Date.now().toString().slice(-8)}`;
        const orderOptions = {
            amount: 1 * 100, // Convert to paise
            currency: 'INR',
            receipt: receipt,
        };

        const razorpayOrder = await razorpayInstance.orders.create(orderOptions);

        // Create new internship letter request
        const internshipLetter = new InternshipLetter({
            userId,
            courseId,
            paymentStatus: false,
            uploadStatus: 'upload',
            paymentAmount: course.CourseInternshipPrice,
            paymentCurrency: 'INR',
            razorpayOrderId: razorpayOrder.id,
        });

        await internshipLetter.save();

        return apiResponse(res, {
            success: true,
            message: 'Internship letter request created successfully',
            data: { internshipLetter, razorpayOrder },
            statusCode: 201,
        });
    } catch (error) {
        console.error('Error requesting internship letter:', error);
        return apiResponse(res, {
            success: false,
            message: 'Server error',
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
                Status:internshipLetter.uploadStatus,
                PaymentStatus:internshipLetter.paymentStatus
            },
            createdAt: new Date(),
        };

        await NotificationService.sendAdminNotification(notificationData);

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

module.exports = {
    requestInternshipLetter,
    updatePaymentStatus,
};