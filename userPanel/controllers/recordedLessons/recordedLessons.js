const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth'); 
const Subcourse = require("../../../adminPanel/models/course/subcourse");
const RecordedLesson = require('../../models/recordedLesson/recordedLesson');
const { apiResponse } = require('../../../utils/apiResponse'); 
const razorpayInstance = require('../../../config/razorpay');
const NotificationService = require('../../../Notification/controller/notificationServiceController');
const crypto = require("crypto");
const fs = require('fs');
const axios = require('axios');
require("dotenv").config();

// Import fetch (Node.js 18+ has built-in fetch, for older versions use node-fetch)
const fetch = globalThis.fetch || require('node-fetch');

// Apple IAP Configuration
const applePrivateKey = fs.readFileSync('AuthKey_P25JWDSRNB.p8', 'utf8'); // Update path to your .p8 file
const appleKeyId = process.env.APPLE_KEY_ID; // From App Store Connect
const appleIssuerId = process.env.APPLE_ISSUER_ID; // From App Store Connect

// Cache for Apple public keys (to avoid frequent fetches)
let applePublicKeysCache = null;
let applePublicKeysCacheExpiry = 0;

// Generate JWT for Apple Server API
function generateAppleJWT() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: appleIssuerId,
    iat: now,
    exp: now + 20 * 60, // 20 minutes
    aud: 'appstoreconnect-v1'
  };
  const token = jwt.sign(payload, applePrivateKey, {
    algorithm: 'ES256',
    keyid: appleKeyId
  });
  return token;
}

// Fetch Apple Public Keys (with caching)
async function fetchApplePublicKeys() {
  const now = Date.now();
  if (applePublicKeysCache && now < applePublicKeysCacheExpiry) {
    return applePublicKeysCache;
  }

  const jwtToken = generateAppleJWT();
  const res = await axios.get('https://api.storekit.itunes.apple.com/in-app/purchase/publicKeys', {
    headers: {
      Authorization: `Bearer ${jwtToken}`
    }
  });

  applePublicKeysCache = res.data.keys;
  applePublicKeysCacheExpiry = now + 24 * 60 * 60 * 1000; // Cache for 24 hours
  return applePublicKeysCache;
}

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
    const io = req.app.get('io');

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

    // Use a placeholder ObjectId for system-generated notifications
    const systemSenderId = new mongoose.Types.ObjectId();
    console.log('verifyRecordedLessonsPayment: Generated systemSenderId for notification:', systemSenderId);

    // Create and send notification for successful purchase
    const notificationData = {
      recipientId: userId,
      senderId: systemSenderId,
      title: 'Recorded Lessons Unlocked',
      body: `You have successfully purchased recorded lessons for ${subcourse.subcourseName}. Access them now!`,
      type: 'recorded_lessons_unlocked',
      data: {
        subcourseId: subcourse._id,
      },
      createdAt: new Date(),
    };
    console.log('verifyRecordedLessonsPayment: Preparing notification:', notificationData);

    // Save and send notification
    const notification = await NotificationService.createAndSendNotification(notificationData);
    console.log('verifyRecordedLessonsPayment: Notification created and sent:', { notificationId: notification._id });

    // Emit event (assuming emitBuyRecordedLessons or similar; adjust as needed)
    if (io) {
      console.log('verifyRecordedLessonsPayment: Emitting recorded_lessons event to user:', userId);
      // emitBuyRecordedLessons(io, userId, { id: notification._id, ... }); // Implement if needed
    } else {
      console.log('verifyRecordedLessonsPayment: Socket.IO instance not found');
    }

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

// Verify Apple Recorded Lessons Purchase
exports.verifyAppleRecordedLessons = async (req, res) => {
  try {
    const { signedTransaction, subcourseId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    console.log('verifyAppleRecordedLessons: Starting with inputs:', { userId, subcourseId });

    // Validate required fields
    if (!subcourseId) {
      console.log('verifyAppleRecordedLessons: Missing required fields:', { signedTransaction: !!signedTransaction, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Missing required fields: subcourseId',
        statusCode: 400,
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log('verifyAppleRecordedLessons: Invalid ObjectId:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Fetch subcourse
    console.log('verifyAppleRecordedLessons: Fetching subcourse with ID:', subcourseId);
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log('verifyAppleRecordedLessons: Subcourse not found for ID:', subcourseId);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }
    console.log('verifyAppleRecordedLessons: Subcourse fetched:', { subcourseId, subcourseName: subcourse.subcourseName, appleRecordedProductId: subcourse.appleRecordedProductId });

    // Fetch user
    console.log('verifyAppleRecordedLessons: Fetching user with ID:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('verifyAppleRecordedLessons: User not found:', { userId });
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if recorded lessons already purchased
    const existingRecordedLesson = await RecordedLesson.findOne({ userId, subcourseId });
    if (existingRecordedLesson && existingRecordedLesson.paymentStatus) {
      console.log('verifyAppleRecordedLessons: Recorded lessons already purchased:', { userId, subcourseId });
      return apiResponse(res, {
        success: true,
        message: 'Recorded lessons already purchased',
        data: { purchased: true, subcourseId, subcourseName: subcourse.subcourseName },
        statusCode: 200,
      });
    }

    let payload;
    if (req.query.mock === 'true') {
      console.log('verifyAppleRecordedLessons: Using mock payload for testing');
      const mockProductId = subcourse.appleRecordedProductId || 'com.yourapp.rec.dummy';  // Fallback for testing
      payload = {
        transactionId: `mock_rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: mockProductId,
        purchaseDate: Date.now(),
      };
      console.log('verifyAppleRecordedLessons: Mock payload created:', { transactionId: payload.transactionId, productId: payload.productId });
    } else if (signedTransaction) {
      // Verify transaction using Apple's server-to-server verification
      console.log('verifyAppleRecordedLessons: Verifying receipt with Apple servers');
      const verificationResult = await verifyAppleReceiptWithServer(signedTransaction, true); // true for sandbox
      
      if (!verificationResult.success) {
        console.log('verifyAppleRecordedLessons: Apple verification failed:', verificationResult.error);
        return apiResponse(res, {
          success: false,
          message: `Failed to verify Apple purchase: ${verificationResult.error}`,
          statusCode: 400,
        });
      }
      
      // Extract transaction data from Apple's response
      const receiptInfo = verificationResult.latestReceiptInfo;
      if (!receiptInfo || receiptInfo.length === 0) {
        console.log('verifyAppleRecordedLessons: No transactions found in receipt');
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
      
      console.log('verifyAppleRecordedLessons: Apple verification successful:', { 
        transactionId: payload.transactionId, 
        productId: payload.productId,
        purchaseDate: new Date(payload.purchaseDate).toISOString()
      });
    } else {
      console.log('verifyAppleRecordedLessons: Missing signedTransaction for real verification');
      return apiResponse(res, {
        success: false,
        message: 'Missing signedTransaction for verification',
        statusCode: 400,
      });
    }

    // Check if productId matches subcourse's appleRecordedProductId
    const expectedProductId = subcourse.appleRecordedProductId || 'com.yourapp.rec.dummy';
    if (payload.productId !== expectedProductId) {
      console.log('verifyAppleRecordedLessons: Product mismatch:', { expected: expectedProductId, actual: payload.productId });
      return apiResponse(res, {
        success: false,
        message: 'Product mismatch',
        statusCode: 400,
      });
    }

    // Check if transaction already processed
    if (existingRecordedLesson && existingRecordedLesson.appleTransactionId === payload.transactionId) {
      console.log('verifyAppleRecordedLessons: Transaction already processed:', { transactionId: payload.transactionId });
      return apiResponse(res, {
        success: true,
        message: 'Purchase already verified',
        data: { purchased: true },
        statusCode: 200,
      });
    }

    // Update or create RecordedLesson with Apple IAP details
    console.log('verifyAppleRecordedLessons: Checking for existing RecordedLesson:', { userId, subcourseId });
    const paymentAmount = subcourse.recordedlessonsPrice || 0;
    const paymentCurrency = 'USD'; // Apple IAP typically in USD

    if (!existingRecordedLesson) {
      console.log('verifyAppleRecordedLessons: Creating new RecordedLesson for:', { userId, subcourseId });
      const recordedLesson = new RecordedLesson({
        userId,
        subcourseId,
        paymentStatus: true,
        appleTransactionId: payload.transactionId,
        paymentAmount,
        paymentCurrency,
        paymentDate: new Date(payload.purchaseDate || Date.now()),
      });
      await recordedLesson.save();
      console.log('verifyAppleRecordedLessons: RecordedLesson created:', { recordedLessonId: recordedLesson._id });
    } else {
      console.log('verifyAppleRecordedLessons: Updating existing RecordedLesson:', { recordedLessonId: existingRecordedLesson._id });
      existingRecordedLesson.paymentStatus = true;
      existingRecordedLesson.appleTransactionId = payload.transactionId;
      existingRecordedLesson.paymentAmount = paymentAmount;
      existingRecordedLesson.paymentCurrency = paymentCurrency;
      existingRecordedLesson.paymentDate = new Date(payload.purchaseDate || Date.now());
      await existingRecordedLesson.save();
      console.log('verifyAppleRecordedLessons: RecordedLesson updated:', { recordedLessonId: existingRecordedLesson._id });
    }

    // Use a placeholder ObjectId for system-generated notifications
    const systemSenderId = new mongoose.Types.ObjectId();
    console.log('verifyAppleRecordedLessons: Generated systemSenderId for notification:', systemSenderId);

    // Create and send notification for successful purchase
    const notificationData = {
      recipientId: userId,
      senderId: systemSenderId,
      title: 'Recorded Lessons Unlocked',
      body: `You have successfully purchased recorded lessons for ${subcourse.subcourseName}. Access them now!`,
      type: 'recorded_lessons_unlocked',
      data: {
        subcourseId: subcourse._id,
      },
      createdAt: new Date(),
    };
    console.log('verifyAppleRecordedLessons: Preparing notification:', notificationData);

    // Save and send notification
    const notification = await NotificationService.createAndSendNotification(notificationData);
    console.log('verifyAppleRecordedLessons: Notification created and sent:', { notificationId: notification._id });

    // Emit event (assuming emitBuyRecordedLessons or similar; adjust as needed)
    if (io) {
      console.log('verifyAppleRecordedLessons: Emitting recorded_lessons event to user:', userId);
      // emitBuyRecordedLessons(io, userId, { id: notification._id, ... }); // Implement if needed
    } else {
      console.log('verifyAppleRecordedLessons: Socket.IO instance not found');
    }

    console.log('verifyAppleRecordedLessons: Apple IAP verification successful');
    return apiResponse(res, {
      success: true,
      message: 'Apple purchase verified successfully',
      data: {
        recordedLesson: existingRecordedLesson,
        purchased: true,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('verifyAppleRecordedLessons: Error occurred:', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: `Failed to verify Apple purchase: ${error.message}`,
      statusCode: 500,
    });
  }
};