const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth'); 
const UserCourse = require('../../models/UserCourse/userCourse'); 
const Subcourse = require("../../../course/models/subcourse");
const UsermainCourse = require("../../models/UserCourse/usermainCourse");
const { apiResponse } = require('../../../utils/apiResponse'); 
const razorpayInstance = require('../../../config/razorpay');
const NotificationService = require('../../../Notification/controller/notificationService');
const crypto = require("crypto");

// Buy course API
exports.buyCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { subcourseId } = req.body;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
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

    // Check if subcourse exists and fetch certificatePrice
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Check if certificatePrice is defined
    if (!subcourse.certificatePrice || subcourse.certificatePrice <= 0) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing certificate price for the subcourse',
        statusCode: 400,
      });
    }

    // Check if subcourse is already purchased
    if (user.purchasedsubCourses.includes(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse already purchased',
        statusCode: 400,
      });
    }

    // Create Razorpay order with shortened receipt
    const amount = 1;
    const currency = 'INR';
    const receipt = `rcpt_${userId.slice(-8)}_${subcourseId.slice(-8)}_${Date.now().toString().slice(-6)}`;
    if (receipt.length > 40) {
      return apiResponse(res, {
        success: false,
        message: 'Receipt length exceeds Razorpay limit',
        statusCode: 400,
      });
    }

    const order = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt,
      payment_capture: 1, // Auto-capture payment
    });

    // Check if usermainCourse exists for the user and main course
    let usermainCourse = await UsermainCourse.findOne({
      userId,
      courseId: subcourse.courseId,
    });

    // If usermainCourse doesn't exist, create a new one
    if (!usermainCourse) {
      usermainCourse = new UsermainCourse({
        userId,
        courseId: subcourse.courseId,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      });
      await usermainCourse.save();
    }

    // Create or update userCourse entry with payment details
    let userCourse = await UserCourse.findOne({ userId, subcourseId });

    if (!userCourse) {
      userCourse = new UserCourse({
        userId,
        courseId: subcourse.courseId,
        subcourseId,
        paymentStatus: false,
        isCompleted: false,
        progress: '0%',
        razorpayOrderId: order.id,
        paymentAmount: amount,
        paymentCurrency: currency,
      });
    } else {
      userCourse.paymentStatus = false;
      userCourse.razorpayOrderId = order.id;
      userCourse.paymentAmount = amount;
      userCourse.paymentCurrency = currency;
    }

    await userCourse.save();

    // Return order details for frontend payment
    return apiResponse(res, {
      success: true,
      message: 'Order created successfully, proceed with payment',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: razorpayInstance.key_id,
        userCourse,
        usermainCourse,
      },
      statusCode: 200,
    });

  } catch (error) {
    console.error('Error in buyCourse API:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to create order: ${error.message}`,
      statusCode: 500,
    });
  }
};


// Verify payment and update status
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subcourseId } = req.body;
    const userId = req.userId;

    // Validate required fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !subcourseId) {
      console.log('Missing required fields:', { razorpayOrderId, razorpayPaymentId, razorpaySignature, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Missing required fields: ' + 
          (!razorpayOrderId ? 'razorpayOrderId ' : '') +
          (!razorpayPaymentId ? 'razorpayPaymentId ' : '') +
          (!razorpaySignature ? 'razorpaySignature ' : '') +
          (!subcourseId ? 'subcourseId' : ''),
        statusCode: 400,
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log('Invalid ObjectId:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Verify payment signature
    const sign = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayInstance.key_secret)
      .update(sign)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.log('Signature verification failed:', { expectedSignature, razorpaySignature });
      return apiResponse(res, {
        success: false,
        message: 'Payment signature verification failed',
        statusCode: 400,
      });
    }

    // Fetch user and subcourse
    const user = await User.findById(userId);
    const subcourse = await Subcourse.findById(subcourseId);

    if (!user || !subcourse) {
      console.log('User or subcourse not found:', { user, subcourse });
      return apiResponse(res, {
        success: false,
        message: 'User or subcourse not found',
        statusCode: 404,
      });
    }

    // Update userCourse with payment details
    let userCourse = await UserCourse.findOne({ userId, subcourseId, razorpayOrderId });
    if (!userCourse) {
      userCourse = new UserCourse({
        userId,
        courseId: subcourse.courseId,
        subcourseId,
        paymentStatus: true,
        isCompleted: false,
        progress: '0%',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        paymentAmount: subcourse.certificatePrice || 0,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      });
    } else {
      userCourse.paymentStatus = true;
      userCourse.razorpayPaymentId = razorpayPaymentId;
      userCourse.razorpaySignature = razorpaySignature;
      userCourse.paymentDate = new Date();
    }
    await userCourse.save();

    // Add subcourse to user's purchasedsubCourses array
    if (!user.purchasedsubCourses.includes(subcourseId)) {
      user.purchasedsubCourses.push(subcourseId);
      await user.save();
    }

    // Increment totalStudentsEnrolled in subcourse
    subcourse.totalStudentsEnrolled += 1;
    await subcourse.save();

    // Use a placeholder ObjectId for system-generated notifications
    const systemSenderId = new mongoose.Types.ObjectId(); // Generate a new ObjectId for system sender

    // Create and send notification for successful enrollment
    const notificationData = {
      recipientId: userId,
      senderId: systemSenderId, // Use placeholder senderId
      title: 'Subcourse Unlocked',
      body: `You have successfully enrolled in ${subcourse.subcourseName}. Start learning now!`,
      type: 'course_unlocked',
      data: {
        courseId: subcourse.courseId,
        subcourseId: subcourse._id,
      },
    };

    // Save and send notification
    const notification = await NotificationService.createAndSendNotification(notificationData);

    // Emit real-time notification via WebSocket (Socket.IO)
    const io = req.app.get('io');
    if (io) {
      io.to(userId.toString()).emit('new_notification', {
        id: notification._id, // Use the actual notification ID from the saved notification
        title: notificationData.title,
        body: notificationData.body,
        type: notificationData.type,
        createdAt: notification.createdAt,
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Payment verified and subcourse purchased successfully',
      data: {
        userCourse,
        purchasedsubCourses: user.purchasedsubCourses,
        totalStudentsEnrolled: subcourse.totalStudentsEnrolled,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to verify payment: ${error.message}`,
      statusCode: 500,
    });
  }
};