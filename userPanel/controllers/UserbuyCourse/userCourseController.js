const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth'); 
const UserCourse = require('../../models/UserCourse/userCourse'); 
const Subcourse = require("../../../adminPanel/models/course/subcourse");
const UsermainCourse = require("../../models/UserCourse/usermainCourse");
const { apiResponse } = require('../../../utils/apiResponse'); 
const razorpayInstance = require('../../../config/razorpay');
const NotificationService = require('../../../Notification/controller/notificationServiceController');
const crypto = require("crypto");
const { emitBuyCourse } = require('../../../socket/emitters');

// Buy course API
exports.buyCourse = async (req, res) => {
  try {
    const userId = req.userId;
    const { subcourseId } = req.body;

    console.log('buyCourse: Starting with inputs:', { userId, subcourseId });

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log('buyCourse: Invalid ObjectId detected:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Check if user exists
    console.log('buyCourse: Fetching user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('buyCourse: User not found for ID:', userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }
    console.log('buyCourse: User found:', { userId});

    // Check if subcourse exists and fetch certificatePrice
    console.log('buyCourse: Fetching subcourse with ID:', subcourseId);
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log('buyCourse: Subcourse not found for ID:', subcourseId);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }
    console.log('buyCourse: Subcourse found:', { subcourseId, subcourseName: subcourse.subcourseName, certificatePrice: subcourse.certificatePrice });

    // Check if certificatePrice is defined
    if (!subcourse.certificatePrice || subcourse.certificatePrice <= 0) {
      console.log('buyCourse: Invalid or missing certificate price:', { subcourseId, certificatePrice: subcourse.certificatePrice });
      return apiResponse(res, {
        success: false,
        message: 'Invalid or missing certificate price for the subcourse',
        statusCode: 400,
      });
    }

    // Check if subcourse is already purchased
    if (user.purchasedsubCourses.includes(subcourseId)) {
      console.log('buyCourse: Subcourse already purchased by user:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Subcourse already purchased',
        statusCode: 400,
      });
    }

    // Create Razorpay order with shortened receipt
    const amount = 1; // Note: This seems hardcoded for testing; consider using subcourse.certificatePrice
    const currency = 'INR';
    const receipt = `rcpt_${userId.slice(-8)}_${subcourseId.slice(-8)}_${Date.now().toString().slice(-6)}`;
    console.log('buyCourse: Generating Razorpay order with:', { amount, currency, receipt });

    if (receipt.length > 40) {
      console.log('buyCourse: Receipt length exceeds Razorpay limit:', { receipt, length: receipt.length });
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
    console.log('buyCourse: Razorpay order created:', { orderId: order.id, amount: order.amount, currency: order.currency });

    // Check if usermainCourse exists for the user and main course
    console.log('buyCourse: Checking for existing usermainCourse:', { userId, courseId: subcourse.courseId });
    let usermainCourse = await UsermainCourse.findOne({
      userId,
      courseId: subcourse.courseId,
    });

    // If usermainCourse doesn't exist, create a new one
    if (!usermainCourse) {
      console.log('buyCourse: Creating new usermainCourse for:', { userId, courseId: subcourse.courseId });
      usermainCourse = new UsermainCourse({
        userId,
        courseId: subcourse.courseId,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      });
      await usermainCourse.save();
      console.log('buyCourse: usermainCourse created:', { usermainCourseId: usermainCourse._id });
    } else {
      console.log('buyCourse: usermainCourse already exists:', { usermainCourseId: usermainCourse._id });
    }

    // Create or update userCourse entry with payment details
    console.log('buyCourse: Checking for existing userCourse:', { userId, subcourseId });
    let userCourse = await UserCourse.findOne({ userId, subcourseId });

    if (!userCourse) {
      console.log('buyCourse: Creating new userCourse for:', { userId, subcourseId });
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
      console.log('buyCourse: Updating existing userCourse:', { userCourseId: userCourse._id });
      userCourse.paymentStatus = false;
      userCourse.razorpayOrderId = order.id;
      userCourse.paymentAmount = amount;
      userCourse.paymentCurrency = currency;
    }

    await userCourse.save();
    console.log('buyCourse: userCourse saved:', { userCourseId: userCourse._id, razorpayOrderId: order.id });

    // Return order details for frontend payment
    console.log('buyCourse: Order creation successful, returning response');
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
    console.error('buyCourse: Error occurred:', { error: error.message, stack: error.stack });
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
    const io = req.app.get('io');

    console.log('verifyPayment: Starting with inputs:', { userId, razorpayOrderId, razorpayPaymentId, subcourseId });

    // Validate required fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !subcourseId) {
      console.log('verifyPayment: Missing required fields:', { razorpayOrderId, razorpayPaymentId, razorpaySignature, subcourseId });
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
      console.log('verifyPayment: Invalid ObjectId:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Verify payment signature
    const sign = `${razorpayOrderId}|${razorpayPaymentId}`;
    console.log('verifyPayment: Generating signature for:', { sign });
    const expectedSignature = crypto
      .createHmac('sha256', razorpayInstance.key_secret)
      .update(sign)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.log('verifyPayment: Signature verification failed:', { expectedSignature, razorpaySignature });
      return apiResponse(res, {
        success: false,
        message: 'Payment signature verification failed',
        statusCode: 400,
      });
    }
    console.log('verifyPayment: Payment signature verified successfully');

    // Fetch user and subcourse
    console.log('verifyPayment: Fetching user with ID:', userId);
    const user = await User.findById(userId);
    console.log('verifyPayment: Fetching subcourse with ID:', subcourseId);
    const subcourse = await Subcourse.findById(subcourseId);

    if (!user || !subcourse) {
      console.log('verifyPayment: User or subcourse not found:', { user: !!user, subcourse: !!subcourse });
      return apiResponse(res, {
        success: false,
        message: 'User or subcourse not found',
        statusCode: 404,
      });
    }
    console.log('verifyPayment: User and subcourse found:', { userId,  subcourseId, subcourseName: subcourse.subcourseName });

    // Update userCourse with payment details
    console.log('verifyPayment: Checking for existing userCourse:', { userId, subcourseId, razorpayOrderId });
    let userCourse = await UserCourse.findOne({ userId, subcourseId, razorpayOrderId });
    if (!userCourse) {
      console.log('verifyPayment: Creating new userCourse for:', { userId, subcourseId });
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
      console.log('verifyPayment: Updating existing userCourse:', { userCourseId: userCourse._id });
      userCourse.paymentStatus = true;
      userCourse.razorpayPaymentId = razorpayPaymentId;
      userCourse.razorpaySignature = razorpaySignature;
      userCourse.paymentDate = new Date();
    }
    await userCourse.save();
    console.log('verifyPayment: userCourse saved:', { userCourseId: userCourse._id, paymentStatus: userCourse.paymentStatus });

    // Add subcourse to user's purchasedsubCourses array
    if (!user.purchasedsubCourses.includes(subcourseId)) {
      console.log('verifyPayment: Adding subcourse to purchasedsubCourses:', { subcourseId });
      user.purchasedsubCourses.push(subcourseId);
      await user.save();
      console.log('verifyPayment: User updated with purchasedsubCourses:', { purchasedsubCourses: user.purchasedsubCourses });
    } else {
      console.log('verifyPayment: Subcourse already in purchasedsubCourses:', { subcourseId });
    }

    // Increment totalStudentsEnrolled in subcourse
    subcourse.totalStudentsEnrolled += 1;
    await subcourse.save();
    console.log('verifyPayment: Subcourse updated:', { subcourseId, totalStudentsEnrolled: subcourse.totalStudentsEnrolled });

    // Use a placeholder ObjectId for system-generated notifications
    const systemSenderId = new mongoose.Types.ObjectId();
    console.log('verifyPayment: Generated systemSenderId for notification:', systemSenderId);

    // Create and send notification for successful enrollment
    const notificationData = {
      recipientId: userId,
      senderId: systemSenderId,
      title: 'Subcourse Unlocked',
      body: `You have successfully enrolled in ${subcourse.subcourseName}. Start learning now!`,
      type: 'course_unlocked',
      data: {
        courseId: subcourse.courseId,
        subcourseId: subcourse._id,
      },
      createdAt: new Date(),
    };
    console.log('verifyPayment: Preparing notification:', notificationData);

    // Save and send notification
    const notification = await NotificationService.createAndSendNotification(notificationData);
    console.log('verifyPayment: Notification created and sent:', { notificationId: notification._id });

    // Emit buy_course event
    if (io) {
      console.log('verifyPayment: Emitting buy_course event to user:', userId);
      emitBuyCourse(io, userId, {
        id: notification._id,
        title: notificationData.title,
        body: notificationData.body,
        type: notificationData.type,
        createdAt: notification.createdAt,
        courseId: subcourse.courseId,
        subcourseId: subcourse._id,
      });
    } else {
      console.log('verifyPayment: Socket.IO instance not found');
    }

    console.log('verifyPayment: Payment verification and subcourse purchase successful');
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
    console.error('verifyPayment: Error occurred:', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: `Failed to verify payment: ${error.message}`,
      statusCode: 500,
    });
  }
};