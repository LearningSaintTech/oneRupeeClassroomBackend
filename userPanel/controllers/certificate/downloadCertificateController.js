const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const User = require('../../models/Auth/Auth');
const Subcourse = require('../../../adminPanel/models/course/subcourse');
const CertificateTemplate = require('../../../adminPanel/models/Templates/certificateTemplate');
const UserCourse = require('../../models/UserCourse/userCourse');
const usermainCourse = require('../../models/UserCourse/usermainCourse');
const Course = require('../../../adminPanel/models/course/course');
const CertificatePayment = require('../../models/certificates/certificate');
const { apiResponse } = require('../../../utils/apiResponse');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const razorpayInstance = require('../../../config/razorpay');
const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios');
require("dotenv").config();

// Import fetch (Node.js 18+ has built-in fetch, for older versions use node-fetch)
const fetch = globalThis.fetch || require('node-fetch');

// Apple IAP Configuration for Certificates
const applePrivateKey = fs.readFileSync('AuthKey_P25JWDSRNB.p8', 'utf8'); // Update path to your .p8 file
const appleKeyId = process.env.APPLE_KEY_ID; // From App Store Connect
const appleIssuerId = process.env.APPLE_ISSUER_ID; // From App Store Connect

// Helper function to get Apple error descriptions
function getAppleErrorDescription(statusCode) {
  const errorCodes = {
    21000: 'The App Store could not read the receipt data',
    21002: 'The receipt data was malformed or missing',
    21003: 'The receipt could not be authenticated',
    21004: 'The shared secret you provided does not match the shared secret on file for your account',
    21005: 'The receipt server is not currently available',
    21006: 'This receipt is valid but the subscription has expired',
    21007: 'This receipt is from the sandbox environment, but it was sent to the production environment for verification',
    21008: 'This receipt is from the production environment, but it was sent to the sandbox environment for verification',
    21009: 'Internal data access error',
    21010: 'The user account cannot be found or has been deleted'
  };
  
  return errorCodes[statusCode] || `Unknown error code: ${statusCode}`;
}

// Apple Server-to-Server Receipt Verification
async function verifyAppleReceiptWithServer(receiptData, isSandbox = true) {
  try {
    console.log("🔍 [Apple Server Verification] Starting server verification");
    console.log("🔍 [Apple Server Verification] Receipt length:", receiptData.length);
    console.log("🔍 [Apple Server Verification] Environment:", isSandbox ? 'Sandbox' : 'Production');
    
    const sharedSecret = process.env.APPLE_SHARED_SECRET;
    console.log("🔍 [Apple Server Verification] Loaded APPLE_SHARED_SECRET from environment:", sharedSecret || 'Not set');
    if (!sharedSecret) {
      console.error("❌ [Apple Server Verification] APPLE_SHARED_SECRET not found in environment variables");
      return {
        success: false,
        error: 'Apple Shared Secret not configured. Please set APPLE_SHARED_SECRET in your environment variables.',
        data: null
      };
    }

    const url = isSandbox 
      ? 'https://sandbox.itunes.apple.com/verifyReceipt'
      : 'https://buy.itunes.apple.com/verifyReceipt';
    
    const requestBody = {
      'receipt-data': receiptData,
      'password': sharedSecret,
      'exclude-old-transactions': true
    };
    
    console.log("🔍 [Apple Server Verification] Request body:", {
      'receipt-data': receiptData.substring(0, 100) + '...',
      'password': requestBody.password ? '***' : 'not set',
      'exclude-old-transactions': requestBody['exclude-old-transactions']
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log("🔍 [Apple Server Verification] Apple response:", JSON.stringify(result, null, 2));
    
    if (result.status === 0) {
      console.log("✅ [Apple Server Verification] Receipt verified successfully");
      return {
        success: true,
        data: result,
        latestReceiptInfo: result.latest_receipt_info || result.receipt?.in_app || []
      };
    } else {
      const errorMessage = getAppleErrorDescription(result.status);
      console.log("❌ [Apple Server Verification] Receipt verification failed:", result.status, errorMessage);
      return {
        success: false,
        error: `Apple verification failed: ${errorMessage} (Status: ${result.status})`,
        data: result
      };
    }
  } catch (error) {
    console.error('verifyAppleReceiptWithServer: Error:', error.message);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

const NotificationService = require('../../../Notification/controller/notificationServiceController');

// Request Subcourse Certificate Payment
exports.requestSubcourseCertificatePayment = async (req, res) => {
  try {
    const { subcourseId } = req.body;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, subcourseId: ${subcourseId}`);

    // Validate input
    if (!subcourseId) {
      console.log('[DEBUG] Subcourse ID missing in request body');
      return apiResponse(res, {
        success: false,
        message: 'Subcourse ID is required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`[DEBUG] Invalid subcourseId format: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if subcourse exists
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log(`[DEBUG] Subcourse not found for ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Check if user has completed the subcourse
    const userCourse = await UserCourse.findOne({ userId, subcourseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] Subcourse not completed or not enrolled - userId: ${userId}, subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not completed or not enrolled',
        statusCode: 403,
      });
    }

    // Check for existing certificate payment
    let certificatePayment = await CertificatePayment.findOne({ userId, subcourseId });

    if (certificatePayment && certificatePayment.paymentStatus === true) {
      console.log(`[DEBUG] Payment already completed for subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment already completed for this subcourse certificate',
        statusCode: 400,
      });
    }

    // Verify certificate price
    if (!subcourse.certificatePrice || subcourse.certificatePrice <= 0) {
      console.log(`[DEBUG] Certificate price not defined for subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Certificate price not defined for this subcourse',
        statusCode: 400,
      });
    }

    // Create Razorpay order
    const receipt = `subcert_${userId.toString().slice(0, 12)}_${Date.now().toString().slice(-8)}`;
    const orderOptions = {
      amount: subcourse.certificatePrice * 100, // Convert to paise
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

    if (certificatePayment && certificatePayment.paymentStatus === false) {
      // Update existing certificate payment with new Razorpay order
      certificatePayment.razorpayOrderId = razorpayOrder.id;
      certificatePayment.paymentAmount = subcourse.certificatePrice;
      certificatePayment.paymentCurrency = 'INR';
      certificatePayment.updatedAt = new Date();

      await certificatePayment.save();
      console.log(`[DEBUG] Certificate payment updated - subcourseId: ${subcourseId}, razorpayOrderId: ${razorpayOrder.id}`);
    } else {
      // Create new certificate payment request
      certificatePayment = new CertificatePayment({
        userId,
        subcourseId,
        paymentStatus: false,
        paymentAmount: subcourse.certificatePrice,
        paymentCurrency: 'INR',
        razorpayOrderId: razorpayOrder.id,
      });

      await certificatePayment.save();
      console.log(`[DEBUG] Certificate payment request created - subcourseId: ${subcourseId}, razorpayOrderId: ${razorpayOrder.id}`);
    }

    return apiResponse(res, {
      success: true,
      message: certificatePayment.isNew ? 'Subcourse certificate payment request created successfully' : 'Subcourse certificate payment request updated successfully',
      data: { certificatePayment, razorpayOrder },
      statusCode: 201,
    });
  } catch (error) {
    console.error('[DEBUG] Error in requestSubcourseCertificatePayment:', error);
    return apiResponse(res, {
      success: false,
      message: `Server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Request Main Course Certificate Payment
exports.requestMainCourseCertificatePayment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, courseId: ${courseId}`);

    // Validate input
    if (!courseId) {
      console.log('[DEBUG] Course ID missing in request body');
      return apiResponse(res, {
        success: false,
        message: 'Course ID is required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`[DEBUG] Invalid courseId format: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
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

    // Check if user has completed the course
    const userCourse = await usermainCourse.findOne({ userId, courseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] Course not completed or not enrolled - userId: ${userId}, courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not completed or not enrolled',
        statusCode: 403,
      });
    }

    // Check for existing certificate payment
    let certificatePayment = await CertificatePayment.findOne({ userId, courseId });

    if (certificatePayment && certificatePayment.paymentStatus === true) {
      console.log(`[DEBUG] Payment already completed for courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment already completed for this course certificate',
        statusCode: 400,
      });
    }

    // Verify certificate price
    if (!course.courseCertificatePrice || course.courseCertificatePrice <= 0) {
      console.log(`[DEBUG] Certificate price not defined for courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Certificate price not defined for this course',
        statusCode: 400,
      });
    }

    // Create Razorpay order
    const receipt = `maincert_${userId.toString().slice(0, 12)}_${Date.now().toString().slice(-8)}`;
    const orderOptions = {
      amount: course.courseCertificatePrice * 100, // Convert to paise
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

    if (certificatePayment && certificatePayment.paymentStatus === false) {
      // Update existing certificate payment with new Razorpay order
      certificatePayment.razorpayOrderId = razorpayOrder.id;
      certificatePayment.paymentAmount = course.courseCertificatePrice;
      certificatePayment.paymentCurrency = 'INR';
      certificatePayment.updatedAt = new Date();

      await certificatePayment.save();
      console.log(`[DEBUG] Certificate payment updated - courseId: ${courseId}, razorpayOrderId: ${razorpayOrder.id}`);
    } else {
      // Create new certificate payment request
      certificatePayment = new CertificatePayment({
        userId,
        courseId,
        paymentStatus: false,
        paymentAmount: course.courseCertificatePrice,
        paymentCurrency: 'INR',
        razorpayOrderId: razorpayOrder.id,
      });

      await certificatePayment.save();
      console.log(`[DEBUG] Certificate payment request created - courseId: ${courseId}, razorpayOrderId: ${razorpayOrder.id}`);
    }

    return apiResponse(res, {
      success: true,
      message: certificatePayment.isNew ? 'Main course certificate payment request created successfully' : 'Main course certificate payment request updated successfully',
      data: { certificatePayment, razorpayOrder },
      statusCode: 201,
    });
  } catch (error) {
    console.error('[DEBUG] Error in requestMainCourseCertificatePayment:', error);
    return apiResponse(res, {
      success: false,
      message: `Server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Verify Certificate Payment
exports.verifyCertificatePayment = async (req, res) => {
  try {
    const { certificatePaymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.userId;

    console.log(`[DEBUG] Verifying payment - certificatePaymentId: ${certificatePaymentId}, userId: ${userId}`);

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(certificatePaymentId)) {
      console.log('[DEBUG] Invalid certificate payment ID');
      return apiResponse(res, {
        success: false,
        message: 'Invalid certificate payment ID',
        statusCode: 400,
      });
    }

    // Find certificate payment request
    const certificatePayment = await CertificatePayment.findOne({ _id: certificatePaymentId, userId });
    if (!certificatePayment) {
      console.log(`[DEBUG] Certificate payment request not found or unauthorized - certificatePaymentId: ${certificatePaymentId}`);
      return apiResponse(res, {
        success: false,
        message: 'Certificate payment request not found or unauthorized',
        statusCode: 404,
      });
    }

    // Verify payment signature
    const sign = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayInstance.key_secret)
      .update(sign)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.log('[DEBUG] Payment signature verification failed');
      return apiResponse(res, {
        success: false,
        message: 'Payment signature verification failed',
        statusCode: 400,
      });
    }

    // Update payment details
    certificatePayment.paymentStatus = true;
    certificatePayment.razorpayOrderId = razorpayOrderId;
    certificatePayment.razorpayPaymentId = razorpayPaymentId;
    certificatePayment.razorpaySignature = razorpaySignature;
    certificatePayment.paymentDate = new Date();

    await certificatePayment.save();

    console.log(`[DEBUG] Payment verified - certificatePaymentId: ${certificatePaymentId}`);
    return apiResponse(res, {
      success: true,
      message: 'Payment verified and status updated successfully',
      data: certificatePayment,
      statusCode: 200,
    });
  } catch (error) {
    console.error('[DEBUG] Error in verifyCertificatePayment:', error);
    return apiResponse(res, {
      success: false,
      message: `Server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Verify Apple Subcourse Certificate Payment
exports.verifyAppleSubcourseCertificate = async (req, res) => {
  try {
    const { signedTransaction, subcourseId } = req.body;
    const userId = req.userId;

    console.log('verifyAppleSubcourseCertificate: Starting with inputs:', { userId, subcourseId });

    // Validate required fields
    if (!subcourseId) {
      console.log('verifyAppleSubcourseCertificate: Missing required fields:', { signedTransaction: !!signedTransaction, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Missing required fields: subcourseId',
        statusCode: 400,
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log('verifyAppleSubcourseCertificate: Invalid ObjectId:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Fetch subcourse
    console.log('verifyAppleSubcourseCertificate: Fetching subcourse with ID:', subcourseId);
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log('verifyAppleSubcourseCertificate: Subcourse not found for ID:', subcourseId);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }
    console.log('verifyAppleSubcourseCertificate: Subcourse fetched:', { subcourseId, subcourseName: subcourse.subcourseName, appleCertificateProductId: subcourse.appleCertificateProductId });

    // Fetch user
    console.log('verifyAppleSubcourseCertificate: Fetching user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('verifyAppleSubcourseCertificate: User not found:', { userId });
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if subcourse is completed
    const userCourse = await UserCourse.findOne({ userId, subcourseId, isCompleted: true });
    if (!userCourse) {
      console.log('verifyAppleSubcourseCertificate: Subcourse not completed:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not completed',
        statusCode: 403,
      });
    }

    // Check for existing certificate payment
    let certificatePayment = await CertificatePayment.findOne({ userId, subcourseId });
    if (certificatePayment && certificatePayment.paymentStatus === true) {
      console.log('verifyAppleSubcourseCertificate: Certificate already paid:', { userId, subcourseId });
      return apiResponse(res, {
        success: true,
        message: 'Certificate already purchased',
        data: { purchased: true, subcourseId, subcourseName: subcourse.subcourseName },
        statusCode: 200,
      });
    }

    let payload;
    if (req.query.mock === 'true') {
      console.log('verifyAppleSubcourseCertificate: Using mock payload for testing');
      const mockProductId = subcourse.appleCertificateProductId || 'com.yourapp.cert.dummy.subcourse';  // Fallback for testing, assume subcourse.appleCertificateProductId is set
      payload = {
        transactionId: `mock_cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: mockProductId,
        purchaseDate: Date.now(),
      };
      console.log('verifyAppleSubcourseCertificate: Mock payload created:', { transactionId: payload.transactionId, productId: payload.productId });
    } else if (signedTransaction) {
      // Verify transaction using Apple's server-to-server verification
      console.log('verifyAppleSubcourseCertificate: Verifying receipt with Apple servers');
      const verificationResult = await verifyAppleReceiptWithServer(signedTransaction, true); // true for sandbox
      
      if (!verificationResult.success) {
        console.log('verifyAppleSubcourseCertificate: Apple verification failed:', verificationResult.error);
        return apiResponse(res, {
          success: false,
          message: `Failed to verify Apple purchase: ${verificationResult.error}`,
          statusCode: 400,
        });
      }
      
      // Extract transaction data from Apple's response
      const receiptInfo = verificationResult.latestReceiptInfo;
      if (!receiptInfo || receiptInfo.length === 0) {
        console.log('verifyAppleSubcourseCertificate: No transactions found in receipt');
        return apiResponse(res, {
          success: false,
          message: 'No valid transactions found in receipt',
          statusCode: 400,
        });
      }
      
      // Get the latest transaction (most recent purchase)
      const latestTransaction = receiptInfo[receiptInfo.length - 1];
      payload = {
        transactionId: latestTransaction.transaction_id,
        productId: latestTransaction.product_id,
        purchaseDate: parseInt(latestTransaction.purchase_date_ms),
        originalTransactionId: latestTransaction.original_transaction_id,
        webOrderLineItemId: latestTransaction.web_order_line_item_id
      };
      
      console.log('verifyAppleSubcourseCertificate: Apple verification successful:', { 
        transactionId: payload.transactionId, 
        productId: payload.productId,
        purchaseDate: new Date(payload.purchaseDate).toISOString()
      });
    } else {
      console.log('verifyAppleSubcourseCertificate: Missing signedTransaction for real verification');
      return apiResponse(res, {
        success: false,
        message: 'Missing signedTransaction for verification',
        statusCode: 400,
      });
    }

    // Check if productId matches subcourse's appleCertificateProductId
    const expectedProductId = subcourse.appleCertificateProductId || 'com.yourapp.cert.dummy.subcourse';
    if (payload.productId !== expectedProductId) {
      console.log('verifyAppleSubcourseCertificate: Product mismatch:', { expected: expectedProductId, actual: payload.productId });
      return apiResponse(res, {
        success: false,
        message: 'Product mismatch',
        statusCode: 400,
      });
    }

    // Check if transaction already processed
    if (certificatePayment && certificatePayment.appleTransactionId === payload.transactionId) {
      console.log('verifyAppleSubcourseCertificate: Transaction already processed:', { transactionId: payload.transactionId });
      return apiResponse(res, {
        success: true,
        message: 'Certificate purchase already verified',
        data: { purchased: true },
        statusCode: 200,
      });
    }

    // Create or update certificatePayment with Apple IAP details
    console.log('verifyAppleSubcourseCertificate: Updating/creating certificatePayment:', { userId, subcourseId });
    const paymentAmount = subcourse.certificatePrice || 0;
    const paymentCurrency = 'INR'; // Apple IAP typically in USD

    if (!certificatePayment) {
      console.log('verifyAppleSubcourseCertificate: Creating new certificatePayment for:', { userId, subcourseId });
      certificatePayment = new CertificatePayment({
        userId,
        subcourseId,
        paymentStatus: true,
        appleTransactionId: payload.transactionId,
        paymentAmount,
        paymentCurrency,
        paymentDate: new Date(payload.purchaseDate || Date.now()),
      });
    } else {
      console.log('verifyAppleSubcourseCertificate: Updating existing certificatePayment:', { certificatePaymentId: certificatePayment._id });
      certificatePayment.paymentStatus = true;
      certificatePayment.appleTransactionId = payload.transactionId;
      certificatePayment.paymentAmount = paymentAmount;
      certificatePayment.paymentCurrency = paymentCurrency;
      certificatePayment.paymentDate = new Date(payload.purchaseDate || Date.now());
    }
    await certificatePayment.save();
    console.log('verifyAppleSubcourseCertificate: certificatePayment saved:', { certificatePaymentId: certificatePayment._id, paymentStatus: certificatePayment.paymentStatus });

    console.log('verifyAppleSubcourseCertificate: Apple IAP verification and certificate purchase successful');
    return apiResponse(res, {
      success: true,
      message: 'Apple purchase verified and certificate unlocked successfully',
      data: {
        certificatePayment,
        purchased: true,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('verifyAppleSubcourseCertificate: Error occurred:', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: `Failed to verify Apple certificate purchase: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Verify Apple Main Course Certificate Payment
exports.verifyAppleMainCourseCertificate = async (req, res) => {
  try {
    const { signedTransaction, courseId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    console.log('verifyAppleMainCourseCertificate: Starting with inputs:', { userId, courseId });

    // Validate required fields
    if (!courseId) {
      console.log('verifyAppleMainCourseCertificate: Missing required fields:', { signedTransaction: !!signedTransaction, courseId });
      return apiResponse(res, {
        success: false,
        message: 'Missing required fields: courseId',
        statusCode: 400,
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      console.log('verifyAppleMainCourseCertificate: Invalid ObjectId:', { userId, courseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or courseId',
        statusCode: 400,
      });
    }

    // Fetch course
    console.log('verifyAppleMainCourseCertificate: Fetching course with ID:', courseId);
    const course = await Course.findById(courseId);
    if (!course) {
      console.log('verifyAppleMainCourseCertificate: Course not found for ID:', courseId);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }
    console.log('verifyAppleMainCourseCertificate: Course fetched:', { courseId, courseName: course.courseName, appleCertificateProductId: course.appleCertificateProductId });

    // Fetch user
    console.log('verifyAppleMainCourseCertificate: Fetching user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('verifyAppleMainCourseCertificate: User not found:', { userId });
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if course is completed
    const userMainCourse = await usermainCourse.findOne({ userId, courseId, isCompleted: true });
    if (!userMainCourse) {
      console.log('verifyAppleMainCourseCertificate: Course not completed:', { userId, courseId });
      return apiResponse(res, {
        success: false,
        message: 'Course not completed',
        statusCode: 403,
      });
    }

    // Check for existing certificate payment
    let certificatePayment = await CertificatePayment.findOne({ userId, courseId });
    if (certificatePayment && certificatePayment.paymentStatus === true) {
      console.log('verifyAppleMainCourseCertificate: Certificate already paid:', { userId, courseId });
      return apiResponse(res, {
        success: true,
        message: 'Certificate already purchased',
        data: { purchased: true, courseId, courseName: course.courseName },
        statusCode: 200,
      });
    }

    let payload;
    if (req.query.mock === 'true') {
      console.log('verifyAppleMainCourseCertificate: Using mock payload for testing');
      const mockProductId = course.appleCertificateProductId || 'com.yourapp.cert.dummy.maincourse';  // Fallback for testing, assume course.appleCertificateProductId is set
      payload = {
        transactionId: `mock_cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: mockProductId,
        purchaseDate: Date.now(),
      };
      console.log('verifyAppleMainCourseCertificate: Mock payload created:', { transactionId: payload.transactionId, productId: payload.productId });
    } else if (signedTransaction) {
      // Verify transaction using Apple's server-to-server verification
      console.log('verifyAppleMainCourseCertificate: Verifying receipt with Apple servers');
      const verificationResult = await verifyAppleReceiptWithServer(signedTransaction, true); // true for sandbox
      
      if (!verificationResult.success) {
        console.log('verifyAppleMainCourseCertificate: Apple verification failed:', verificationResult.error);
        return apiResponse(res, {
          success: false,
          message: `Failed to verify Apple purchase: ${verificationResult.error}`,
          statusCode: 400,
        });
      }
      
      // Extract transaction data from Apple's response
      const receiptInfo = verificationResult.latestReceiptInfo;
      if (!receiptInfo || receiptInfo.length === 0) {
        console.log('verifyAppleMainCourseCertificate: No transactions found in receipt');
        return apiResponse(res, {
          success: false,
          message: 'No valid transactions found in receipt',
          statusCode: 400,
        });
      }
      
      // Get the latest transaction (most recent purchase)
      const latestTransaction = receiptInfo[receiptInfo.length - 1];
      payload = {
        transactionId: latestTransaction.transaction_id,
        productId: latestTransaction.product_id,
        purchaseDate: parseInt(latestTransaction.purchase_date_ms),
        originalTransactionId: latestTransaction.original_transaction_id,
        webOrderLineItemId: latestTransaction.web_order_line_item_id
      };
      
      console.log('verifyAppleMainCourseCertificate: Apple verification successful:', { 
        transactionId: payload.transactionId, 
        productId: payload.productId,
        purchaseDate: new Date(payload.purchaseDate).toISOString()
      });
    } else {
      console.log('verifyAppleMainCourseCertificate: Missing signedTransaction for real verification');
      return apiResponse(res, {
        success: false,
        message: 'Missing signedTransaction for verification',
        statusCode: 400,
      });
    }

    // Check if productId matches course's appleCertificateProductId
    const expectedProductId = course.appleCertificateProductId || 'com.yourapp.cert.dummy.maincourse';
    if (payload.productId !== expectedProductId) {
      console.log('verifyAppleMainCourseCertificate: Product mismatch:', { expected: expectedProductId, actual: payload.productId });
      return apiResponse(res, {
        success: false,
        message: 'Product mismatch',
        statusCode: 400,
      });
    }

    // Check if transaction already processed
    if (certificatePayment && certificatePayment.appleTransactionId === payload.transactionId) {
      console.log('verifyAppleMainCourseCertificate: Transaction already processed:', { transactionId: payload.transactionId });
      return apiResponse(res, {
        success: true,
        message: 'Certificate purchase already verified',
        data: { purchased: true },
        statusCode: 200,
      });
    }

    // Create or update certificatePayment with Apple IAP details
    console.log('verifyAppleMainCourseCertificate: Updating/creating certificatePayment:', { userId, courseId });
    const paymentAmount = course.courseCertificatePrice || 0;
    const paymentCurrency = 'INR'; // Apple IAP typically in USD

    if (!certificatePayment) {
      console.log('verifyAppleMainCourseCertificate: Creating new certificatePayment for:', { userId, courseId });
      certificatePayment = new CertificatePayment({
        userId,
        courseId,
        paymentStatus: true,
        appleTransactionId: payload.transactionId,
        paymentAmount,
        paymentCurrency,
        paymentDate: new Date(payload.purchaseDate || Date.now()),
      });
    } else {
      console.log('verifyAppleMainCourseCertificate: Updating existing certificatePayment:', { certificatePaymentId: certificatePayment._id });
      certificatePayment.paymentStatus = true;
      certificatePayment.appleTransactionId = payload.transactionId;
      certificatePayment.paymentAmount = paymentAmount;
      certificatePayment.paymentCurrency = paymentCurrency;
      certificatePayment.paymentDate = new Date(payload.purchaseDate || Date.now());
    }
    await certificatePayment.save();
    console.log('verifyAppleMainCourseCertificate: certificatePayment saved:', { certificatePaymentId: certificatePayment._id, paymentStatus: certificatePayment.paymentStatus });

    console.log('verifyAppleMainCourseCertificate: Apple IAP verification and certificate purchase successful');
    return apiResponse(res, {
      success: true,
      message: 'Apple purchase verified and certificate unlocked successfully',
      data: {
        certificatePayment,
        purchased: true,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('verifyAppleMainCourseCertificate: Error occurred:', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: `Failed to verify Apple certificate purchase: ${error.message}`,
      statusCode: 500,
    });
  }
};
// Download Subcourse Certificate
exports.downloadCertificate = async (req, res) => {
  try {
    const { subcourseId } = req.params;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, subcourseId: ${subcourseId}`);

    // Validate input
    if (!subcourseId) {
      console.log('[DEBUG] Subcourse ID missing in request body');
      return apiResponse(res, {
        success: false,
        message: 'Subcourse ID is required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`[DEBUG] Invalid subcourseId format: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Check if user has completed the subcourse
    console.log(`[DEBUG] Checking UserCourse for userId: ${userId}, subcourseId: ${subcourseId}`);
    const userCourse = await UserCourse.findOne({ userId, subcourseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] UserCourse not found or subcourse not completed - userId: ${userId}, subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not completed or not enrolled',
        statusCode: 403,
      });
    }

    // Check payment status
    console.log(`[DEBUG] Checking payment status for userId: ${userId}, subcourseId: ${subcourseId}`);
    const certificatePayment = await CertificatePayment.findOne({ userId, subcourseId });
    if (!certificatePayment || !certificatePayment.paymentStatus) {
      console.log(`[DEBUG] Payment not completed for subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment required to download certificate',
        statusCode: 403,
      });
    }

    const template = await CertificateTemplate.findOne().sort({ createdAt: -1 });
    if (!template) {
      console.log('[DEBUG] No certificate template found in database');
      return apiResponse(res, {
        success: false,
        message: 'Certificate template not found',
        statusCode: 404,
      });
    }

    // Fetch user
    console.log(`[DEBUG] Fetching user with ID: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Fetch subcourse
    console.log(`[DEBUG] Fetching subcourse with ID: ${subcourseId}`);
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log(`[DEBUG] Subcourse not found for ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Generate dynamic fields
    const certificateId = `LS-${uuidv4().split('-')[0].toUpperCase()}`;
    const currentDate = moment().tz('Asia/Kolkata').format('DD/MM/YYYY');
    const certificateDescription = subcourse.certificateDescription || 'This certifies that the above-named individual has completed all required modules, assessments, and project work associated with the subcourse, demonstrating the knowledge and skills necessary in the respective field.';
    console.log('[DEBUG] Dynamic fields generated:', { certificateId, currentDate, certificateDescription });

    // Replace placeholders in the template
    console.log('[DEBUG] Replacing placeholders in HTML template');
    let modifiedHtmlContent = template.content;
    console.log('[DEBUG] Original HTML content length:', modifiedHtmlContent.length);
    modifiedHtmlContent = modifiedHtmlContent
      .replace(/{{username}}/g, user.fullName.toUpperCase())
      .replace(/{{subcourseName}}/g, subcourse.subcourseName)
      .replace(/{{certificateDescription}}/g, certificateDescription)
      .replace(/{{certificateId}}/g, certificateId)
      .replace(/{{currentDate}}/g, currentDate);

    // Generate PDF with Puppeteer
    console.log('[DEBUG] Generating PDF with Puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 595, height: 842 });
    await page.setContent(modifiedHtmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await browser.close();

    // Update isCertificateDownloaded to true
    console.log(`[DEBUG] Updating isCertificateDownloaded for userId: ${userId}, subcourseId: ${subcourseId}`);
    await UserCourse.updateOne(
      { userId, subcourseId, isCompleted: true },
      { $set: { isCertificateDownloaded: true } }
    );

    console.log('[DEBUG] PDF generated successfully, buffer length:', pdfBuffer.length);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificateId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[DEBUG] Error in downloadCertificate:', error);
    return apiResponse(res, {
      success: false,
      message: `Error generating certificate: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Download Main Course Certificate
exports.downloadMainCourseCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, courseId: ${courseId}`);

    // Validate input
    if (!courseId) {
      console.log('[DEBUG] Course ID missing in request');
      return apiResponse(res, {
        success: false,
        message: 'Course ID is required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`[DEBUG] Invalid courseId format: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Check if user has completed the course
    console.log(`[DEBUG] Checking usermainCourse for userId: ${userId}, courseId: ${courseId}`);
    const userCourse = await usermainCourse.findOne({ userId, courseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] usermainCourse not found or course not completed - userId: ${userId}, courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not completed or not enrolled',
        statusCode: 403,
      });
    }

    // Check payment status
    console.log(`[DEBUG] Checking payment status for userId: ${userId}, courseId: ${courseId}`);
    const certificatePayment = await CertificatePayment.findOne({ userId, courseId });
    if (!certificatePayment || !certificatePayment.paymentStatus) {
      console.log(`[DEBUG] Payment not completed for courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment required to download certificate',
        statusCode: 403,
      });
    }

    // Fetch template
    console.log('[DEBUG] Fetching certificate template');
    const template = await CertificateTemplate.findOne().sort({ createdAt: -1 });
    if (!template) {
      console.log('[DEBUG] No certificate template found in database');
      return apiResponse(res, {
        success: false,
        message: 'Certificate template not found',
        statusCode: 404,
      });
    }

    // Fetch user
    console.log(`[DEBUG] Fetching user with ID: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Fetch course
    console.log(`[DEBUG] Fetching course with ID: ${courseId}`);
    const course = await Course.findById(courseId);
    if (!course) {
      console.log(`[DEBUG] Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    // Generate dynamic fields
    const certificateId = `LC-${uuidv4().split('-')[0].toUpperCase()}`;
    const currentDate = moment().tz('Asia/Kolkata').format('DD/MM/YYYY');
    const certificateDescription = course.certificateDescription || 'This certifies that the above-named individual has completed all required modules, assessments, and project work associated with the course, demonstrating the knowledge and skills necessary in the respective field.';
    console.log('[DEBUG] Dynamic fields generated:', { certificateId, currentDate, certificateDescription });

    // Replace placeholders in the template
    console.log('[DEBUG] Replacing placeholders in HTML template');
    let modifiedHtmlContent = template.content;
    console.log('[DEBUG] Original HTML content length:', modifiedHtmlContent.length);
    modifiedHtmlContent = modifiedHtmlContent
      .replace(/{{username}}/g, user.fullName.toUpperCase())
      .replace(/{{subcourseName}}/g, course.courseName)
      .replace(/{{certificateDescription}}/g, certificateDescription)
      .replace(/{{certificateId}}/g, certificateId)
      .replace(/{{currentDate}}/g, currentDate);

    // Generate PDF with Puppeteer
    console.log('[DEBUG] Generating PDF with Puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 595, height: 842 });
    await page.setContent(modifiedHtmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await browser.close();

    // Update isCertificateDownloaded to true
    console.log(`[DEBUG] Updating isCertificateDownloaded for userId: ${userId}, courseId: ${courseId}`);
    await usermainCourse.updateOne(
      { userId, courseId, isCompleted: true },
      { $set: { isCertificateDownloaded: true } }
    );

    console.log('[DEBUG] PDF generated successfully, buffer length:', pdfBuffer.length);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificateId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[DEBUG] Error in downloadMainCourseCertificate:', error);
    return apiResponse(res, {
      success: false,
      message: `Error generating certificate: ${error.message}`,
      statusCode: 500,
    });
  }
};