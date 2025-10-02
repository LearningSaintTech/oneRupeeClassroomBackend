const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth'); 
const Subcourse = require("../../../adminPanel/models/course/subcourse");
const RecordedLesson = require('../../models/recordedLesson/recordedLesson');
const { apiResponse } = require('../../../utils/apiResponse'); 
const razorpayInstance = require('../../../config/razorpay');
const NotificationService = require('../../../Notification/controller/notificationServiceController');
const crypto = require("crypto");

// Buy recorded lessons API
exports.buyRecordedLessons = async (req, res) => {
  try {
    const userId = req.userId;
    const { subcourseId } = req.body;

    console.log('buyRecordedLessons: Starting with inputs:', { userId, subcourseId });

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log('buyRecordedLessons: Invalid ObjectId detected:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Check if user exists
    console.log('buyRecordedLessons: Fetching user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('buyRecordedLessons: User not found for ID:', userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }
    console.log('buyRecordedLessons: User found:', { userId });

    // Check if subcourse exists and fetch recordedlessonsPrice
    console.log('buyRecordedLessons: Fetching subcourse with ID:', subcourseId);
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log('buyRecordedLessons: Subcourse not found for ID:', subcourseId);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }
    console.log('buyRecordedLessons: Subcourse found:', { subcourseId, subcourseName: subcourse.subcourseName, recordedlessonsPrice: subcourse.recordedlessonsPrice });

    // Check if recorded lessons are already purchased
    const existingRecordedLesson = await RecordedLesson.findOne({ userId, subcourseId });
    if (existingRecordedLesson && existingRecordedLesson.paymentStatus) {
      console.log('buyRecordedLessons: Recorded lessons already purchased by user:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Recorded lessons already purchased',
        statusCode: 400,
      });
    }

    // Validate price > 0
    const amount = subcourse.recordedlessonsPrice;
    if (amount <= 0) {
      console.log('buyRecordedLessons: Invalid price for recorded lessons:', { amount });
      return apiResponse(res, {
        success: false,
        message: 'Recorded lessons are free or unavailable for purchase',
        statusCode: 400,
      });
    }

    const currency = 'INR';
    const receipt = `rcpt_rec_${userId.slice(-8)}_${subcourseId.slice(-8)}_${Date.now().toString().slice(-6)}`;
    console.log('buyRecordedLessons: Generating Razorpay order with:', { amount, currency, receipt });

    if (receipt.length > 40) {
      console.log('buyRecordedLessons: Receipt length exceeds Razorpay limit:', { receipt, length: receipt.length });
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
    console.log('buyRecordedLessons: Razorpay order created:', { orderId: order.id, amount: order.amount, currency: order.currency });

    // Create or update RecordedLesson entry with payment details
    console.log('buyRecordedLessons: Checking for existing RecordedLesson:', { userId, subcourseId });
    if (!existingRecordedLesson) {
      console.log('buyRecordedLessons: Creating new RecordedLesson for:', { userId, subcourseId });
      const recordedLesson = new RecordedLesson({
        userId,
        subcourseId,
        paymentStatus: false,
        razorpayOrderId: order.id,
        paymentAmount: amount,
        paymentCurrency: currency,
      });
      await recordedLesson.save();
      console.log('buyRecordedLessons: RecordedLesson created:', { recordedLessonId: recordedLesson._id });
    } else {
      console.log('buyRecordedLessons: Updating existing RecordedLesson:', { recordedLessonId: existingRecordedLesson._id });
      existingRecordedLesson.paymentStatus = false;
      existingRecordedLesson.razorpayOrderId = order.id;
      existingRecordedLesson.paymentAmount = amount;
      existingRecordedLesson.paymentCurrency = currency;
      await existingRecordedLesson.save();
      console.log('buyRecordedLessons: RecordedLesson updated:', { recordedLessonId: existingRecordedLesson._id });
    }

    // Return order details for frontend payment
    console.log('buyRecordedLessons: Order creation successful, returning response');
    return apiResponse(res, {
      success: true,
      message: 'Order created successfully, proceed with payment',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        // key: razorpayInstance.key_id,
        recordedLesson: existingRecordedLesson,
      },
      statusCode: 200,
    });

  } catch (error) {
    console.error('buyRecordedLessons: Error occurred:', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: `Failed to create order: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Verify recorded lessons payment and update status
exports.verifyRecordedLessonsPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subcourseId } = req.body;
    const userId = req.userId;

    console.log('verifyRecordedLessonsPayment: Starting with inputs:', { userId, razorpayOrderId, razorpayPaymentId, subcourseId });

    // Validate required fields
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !subcourseId) {
      console.log('verifyRecordedLessonsPayment: Missing required fields:', { razorpayOrderId, razorpayPaymentId, razorpaySignature, subcourseId });
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
      console.log('verifyRecordedLessonsPayment: Invalid ObjectId:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Verify payment signature
    const sign = `${razorpayOrderId}|${razorpayPaymentId}`;
    console.log('verifyRecordedLessonsPayment: Generating signature for:', { sign });
    const expectedSignature = crypto
      .createHmac('sha256', razorpayInstance.key_secret)
      .update(sign)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.log('verifyRecordedLessonsPayment: Signature verification failed:', { expectedSignature, razorpaySignature });
      return apiResponse(res, {
        success: false,
        message: 'Payment signature verification failed',
        statusCode: 400,
      });
    }
    console.log('verifyRecordedLessonsPayment: Payment signature verified successfully');

    // Fetch user and subcourse
    console.log('verifyRecordedLessonsPayment: Fetching user with ID:', userId);
    const user = await User.findById(userId);
    console.log('verifyRecordedLessonsPayment: Fetching subcourse with ID:', subcourseId);
    const subcourse = await Subcourse.findById(subcourseId);

    if (!user || !subcourse) {
      console.log('verifyRecordedLessonsPayment: User or subcourse not found:', { user: !!user, subcourse: !!subcourse });
      return apiResponse(res, {
        success: false,
        message: 'User or subcourse not found',
        statusCode: 404,
      });
    }
    console.log('verifyRecordedLessonsPayment: User and subcourse found:', { userId, subcourseId, subcourseName: subcourse.subcourseName });

    // Fetch and update RecordedLesson with payment details
    console.log('verifyRecordedLessonsPayment: Checking for existing RecordedLesson:', { userId, subcourseId, razorpayOrderId });
    const recordedLesson = await RecordedLesson.findOne({ userId, subcourseId, razorpayOrderId });
    if (!recordedLesson) {
      console.log('verifyRecordedLessonsPayment: RecordedLesson not found for this order');
      return apiResponse(res, {
        success: false,
        message: 'RecordedLesson not found for this order',
        statusCode: 404,
      });
    }

    console.log('verifyRecordedLessonsPayment: Updating existing RecordedLesson:', { recordedLessonId: recordedLesson._id });
    recordedLesson.paymentStatus = true;
    recordedLesson.razorpayPaymentId = razorpayPaymentId;
    recordedLesson.razorpaySignature = razorpaySignature;
    recordedLesson.paymentDate = new Date();
    await recordedLesson.save();
    console.log('verifyRecordedLessonsPayment: RecordedLesson saved:', { recordedLessonId: recordedLesson._id, paymentStatus: recordedLesson.paymentStatus });

    console.log('verifyRecordedLessonsPayment: Payment verification successful');
    return apiResponse(res, {
      success: true,
      message: 'Payment verified successfully',
      data: {
        recordedLesson,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('verifyRecordedLessonsPayment: Error occurred:', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: `Failed to verify payment: ${error.message}`,
      statusCode: 500,
    });
  }
};