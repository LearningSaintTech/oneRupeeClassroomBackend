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
const jose = require('node-jose');
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
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

// Verify Signed Transaction Locally
async function verifyAppleTransactionLocally(signedTransaction) {
  try {
    console.log("🔍 [Apple Receipt] Raw receipt data:", signedTransaction);
    console.log("🔍 [Apple Receipt] Type:", typeof signedTransaction);
    console.log("🔍 [Apple Receipt] Length:", signedTransaction.length);
    
    // Check if it's a JWT format (has 3 parts separated by dots)
    const jwtParts = signedTransaction.split('.');
    console.log("🔍 [Apple Receipt] JWT Parts count:", jwtParts.length);
    
    if (jwtParts.length === 3) {
      console.log("🔍 [Apple Receipt] This is a JWT format");
      
      // Decode header (first part)
      const header = JSON.parse(Buffer.from(jwtParts[0], 'base64').toString('utf-8'));
      console.log("🔍 [Apple Receipt] JWT Header:", JSON.stringify(header, null, 2));
      
      // Decode payload (second part) - this is what we need
      const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString('utf-8'));
      console.log("🔍 [Apple Receipt] JWT Payload:", JSON.stringify(payload, null, 2));
      
      // Get the kid from header for key verification
      const kid = header.kid;
      console.log("🔍 [Apple Receipt] Key ID (kid):", kid);
      
      const keys = await fetchApplePublicKeys();
      console.log("🔍 [Apple Receipt] Available keys:", keys.map(k => ({ kid: k.kid, alg: k.alg })));

      // Find key with matching kid
      const keyData = keys.find(k => k.kid === kid);
      if (!keyData) {
        throw new Error(`Public key not found for kid: ${kid}`);
      }

      console.log("🔍 [Apple Receipt] Found matching key:", keyData);
      
      const key = await jose.JWK.asKey(keyData);
      const verified = await jose.JWS.createVerify(key).verify(signedTransaction);

      // Parsed verified payload
      const verifiedPayload = JSON.parse(verified.payload.toString());
      console.log("🔍 [Apple Receipt] Verified payload:", JSON.stringify(verifiedPayload, null, 2));
      
      return verifiedPayload; // Contains productId, transactionId, purchaseDate, etc.
    } else {
      // This is a PKCS#7 receipt - we need to use Apple's server-to-server verification
      console.log("🔍 [Apple Receipt] This is a PKCS#7 receipt format");
      console.log("🔍 [Apple Receipt] First 100 characters:", signedTransaction.substring(0, 100));
      console.log("🔍 [Apple Receipt] Last 100 characters:", signedTransaction.substring(signedTransaction.length - 100));
      
      // For PKCS#7 receipts, we should use Apple's server-to-server verification
      // instead of local verification
      throw new Error('PKCS#7 receipt detected. Use Apple server-to-server verification instead of local verification.');
    }
  } catch (error) {
    console.error('verifyAppleTransactionLocally: Error:', error.message);
    console.error('verifyAppleTransactionLocally: Stack:', error.stack);
    throw error;
  }
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

// Apple Server-to-Server Receipt Verification with Environment Detection
async function verifyAppleReceiptWithServer(receiptData, isSandbox = false) {
  try {
    console.log("🔍 [Apple Server Verification] Starting server verification");
    console.log("🔍 [Apple Server Verification] Receipt length:", receiptData.length);
    console.log("🔍 [Apple Server Verification] Initial Environment:", isSandbox ? 'Sandbox' : 'Production');
    
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

    // First attempt with the specified environment
    let url = isSandbox 
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
    
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    let result = await response.json();
    console.log("🔍 [Apple Server Verification] Apple response:", JSON.stringify(result, null, 2));
    
    // Handle environment mismatch errors
    if (result.status === 21007) {
      // Receipt is from sandbox but sent to production - retry with sandbox
      console.log("🔄 [Apple Server Verification] Environment mismatch detected (21007) - retrying with sandbox");
      url = 'https://sandbox.itunes.apple.com/verifyReceipt';
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      result = await response.json();
      console.log("🔍 [Apple Server Verification] Retry response:", JSON.stringify(result, null, 2));
    } else if (result.status === 21008) {
      // Receipt is from production but sent to sandbox - retry with production
      console.log("🔄 [Apple Server Verification] Environment mismatch detected (21008) - retrying with production");
      url = 'https://buy.itunes.apple.com/verifyReceipt';
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      result = await response.json();
      console.log("🔍 [Apple Server Verification] Retry response:", JSON.stringify(result, null, 2));
    }
    
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
    console.log('buyCourse: User found:', { userId });

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
    const amount = subcourse.price; // Note: This seems hardcoded for testing; consider using subcourse.certificatePrice
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
        // key: razorpayInstance.key_id,
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
    console.log('verifyPayment: User and subcourse found:', { userId, subcourseId, subcourseName: subcourse.subcourseName });

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





exports.verifyApplePurchase = async (req, res) => {
  try {
    const { signedTransaction, subcourseId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    console.log('verifyApplePurchase: Starting with inputs:', { userId, subcourseId });

    // Validate required fields
    if (!subcourseId) {
      console.log('verifyApplePurchase: Missing subcourseId');
      return apiResponse(res, {
        success: false,
        message: 'Missing required field: subcourseId',
        statusCode: 400,
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log('verifyApplePurchase: Invalid ObjectId:', { userId, subcourseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Fetch subcourse
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log('verifyApplePurchase: Subcourse not found:', subcourseId);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      console.log('verifyApplePurchase: User not found:', userId);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // EARLY CHECK: Already purchased?
    if (user.purchasedsubCourses.some(id => id.toString() === subcourseId)) {
      console.log('verifyApplePurchase: Subcourse already purchased:', { userId, subcourseId });
      return apiResponse(res, {
        success: true,
        message: 'Subcourse already purchased',
        data: { purchased: true, subcourseId, subcourseName: subcourse.subcourseName },
        statusCode: 200,
      });
    }

    let payload;

    if (req.query.mock === 'true') {
      // Mock mode
      console.log('verifyApplePurchase: Using mock verification');
      const mockProductId = subcourse.appleProductId || 'com.yourapp.dummy.fallback';
      payload = {
        transactionId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: mockProductId,
        purchaseDate: Date.now(),
      };
    } else if (!signedTransaction) {
      // Real mode but missing receipt
      console.log('verifyApplePurchase: Missing signedTransaction');
      return apiResponse(res, {
        success: false,
        message: 'Missing signedTransaction for verification',
        statusCode: 400,
      });
    } else {
      // Real Apple verification
      console.log('verifyApplePurchase: Verifying with Apple servers');
      const verificationResult = await verifyAppleReceiptWithServer(signedTransaction, false);

      if (!verificationResult.success) {
        console.log('verifyApplePurchase: Apple verification failed:', verificationResult.error);
        return apiResponse(res, {
          success: false,
          message: `Failed to verify purchase: ${verificationResult.error}`,
          statusCode: 400,
        });
      }

      const receiptInfo = verificationResult.latestReceiptInfo;
      if (!receiptInfo || receiptInfo.length === 0) {
        return apiResponse(res, {
          success: false,
          message: 'No valid transactions in receipt',
          statusCode: 400,
        });
      }

      const expectedProductId = subcourse.appleProductId;
      let matchingTransaction = receiptInfo
        .slice()
        .sort((a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms)) // newest first
        .find(item => !expectedProductId || item.product_id === expectedProductId);

      // Fallback to latest if no match
      if (!matchingTransaction) {
        matchingTransaction = receiptInfo[receiptInfo.length - 1];
      }

      payload = {
        transactionId: matchingTransaction.transaction_id,
        productId: matchingTransaction.product_id,
        purchaseDate: parseInt(matchingTransaction.purchase_date_ms, 10),
        originalTransactionId: matchingTransaction.original_transaction_id || null,
      };

      console.log('verifyApplePurchase: Verified transaction:', {
        transactionId: payload.transactionId,
        productId: payload.productId,
      });
    }

    // Final product ID match check
    const expectedProductId = subcourse.appleProductId || 'com.yourapp.dummy.fallback';
    if (payload.productId !== expectedProductId) {
      console.log('verifyApplePurchase: Product ID mismatch', {
        expected: expectedProductId,
        received: payload.productId,
      });
      return apiResponse(res, {
        success: false,
        message: 'Purchased product does not match this subcourse',
        statusCode: 400,
      });
    }

    // Check if this exact transaction was already processed
    const existingRecord = await UserCourse.findOne({
      userId,
      subcourseId,
      appleTransactionId: payload.transactionId,
    });

    if (existingRecord?.paymentStatus) {
      console.log('verifyApplePurchase: Transaction already processed');
      return apiResponse(res, {
        success: true,
        message: 'Purchase already verified and processed',
        data: { purchased: true },
        statusCode: 200,
      });
    }

    // --- At this point: Valid new purchase! Continue to save... ---
    
    // Check if usermainCourse exists for the user and main course
    console.log('verifyApplePurchase: Checking for existing usermainCourse:', { userId, courseId: subcourse.courseId });
    let usermainCourse = await UsermainCourse.findOne({
      userId,
      courseId: subcourse.courseId,
    });

    // If usermainCourse doesn't exist, create a new one
    if (!usermainCourse) {
      console.log('verifyApplePurchase: Creating new usermainCourse for:', { userId, courseId: subcourse.courseId });
      usermainCourse = new UsermainCourse({
        userId,
        courseId: subcourse.courseId,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      });
      await usermainCourse.save();
      console.log('verifyApplePurchase: usermainCourse created:', { usermainCourseId: usermainCourse._id });
    } else {
      console.log('verifyApplePurchase: usermainCourse already exists:', { usermainCourseId: usermainCourse._id });
    }

    // Create or update userCourse entry with payment details
    console.log('verifyApplePurchase: Checking for existing userCourse:', { userId, subcourseId });
    let userCourse = await UserCourse.findOne({ userId, subcourseId });

    if (!userCourse) {
      console.log('verifyApplePurchase: Creating new userCourse for:', { userId, subcourseId });
      userCourse = new UserCourse({
        userId,
        courseId: subcourse.courseId,
        subcourseId,
        paymentStatus: true,
        isCompleted: false,
        progress: '0%',
        appleTransactionId: payload.transactionId,
        appleProductId: payload.productId,
        paymentAmount: subcourse.certificatePrice || 0,
        paymentCurrency: 'INR',
        paymentDate: new Date(payload.purchaseDate),
      });
    } else {
      console.log('verifyApplePurchase: Updating existing userCourse:', { userCourseId: userCourse._id });
      userCourse.paymentStatus = true;
      userCourse.appleTransactionId = payload.transactionId;
      userCourse.appleProductId = payload.productId;
      userCourse.paymentAmount = subcourse.certificatePrice || 0;
      userCourse.paymentCurrency = 'INR';
      userCourse.paymentDate = new Date(payload.purchaseDate);
    }

    await userCourse.save();
    console.log('verifyApplePurchase: userCourse saved:', { userCourseId: userCourse._id, paymentStatus: userCourse.paymentStatus });

    // Add subcourse to user's purchasedsubCourses array
    if (!user.purchasedsubCourses.includes(subcourseId)) {
      console.log('verifyApplePurchase: Adding subcourse to purchasedsubCourses:', { subcourseId });
      user.purchasedsubCourses.push(subcourseId);
      await user.save();
      console.log('verifyApplePurchase: User updated with purchasedsubCourses:', { purchasedsubCourses: user.purchasedsubCourses });
    } else {
      console.log('verifyApplePurchase: Subcourse already in purchasedsubCourses:', { subcourseId });
    }

    // Increment totalStudentsEnrolled in subcourse
    subcourse.totalStudentsEnrolled += 1;
    await subcourse.save();
    console.log('verifyApplePurchase: Subcourse updated:', { subcourseId, totalStudentsEnrolled: subcourse.totalStudentsEnrolled });

    // Use a placeholder ObjectId for system-generated notifications
    const systemSenderId = new mongoose.Types.ObjectId();
    console.log('verifyApplePurchase: Generated systemSenderId for notification:', systemSenderId);

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
    console.log('verifyApplePurchase: Preparing notification:', notificationData);

    // Save and send notification
    const notification = await NotificationService.createAndSendNotification(notificationData);
    console.log('verifyApplePurchase: Notification created and sent:', { notificationId: notification._id });

    // Emit buy_course event
    if (io) {
      console.log('verifyApplePurchase: Emitting buy_course event to user:', userId);
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
      console.log('verifyApplePurchase: Socket.IO instance not found');
    }

    console.log('verifyApplePurchase: Purchase verification and subcourse purchase successful');
    return apiResponse(res, {
      success: true,
      message: 'Apple purchase verified and subcourse purchased successfully',
      data: {
        userCourse,
        purchasedsubCourses: user.purchasedsubCourses,
        totalStudentsEnrolled: subcourse.totalStudentsEnrolled,
      },
      statusCode: 200,
    });

  } catch (error) {
    console.error('verifyApplePurchase: Unexpected error:', error);
    return apiResponse(res, {
      success: false,
      message: 'Internal server error',
      statusCode: 500,
    });
  }
};


// Check if purchase exists (for both Razorpay and Apple IAP)
exports.checkPurchase = async (req, res) => {
  try {
    const userId = req.userId;
    const { subcourseId } = req.body; // Support both query and body

    if (!userId || !subcourseId) {
      return apiResponse(res, {
        success: false,
        message: 'Missing userId or subcourseId',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    const purchased = user.purchasedsubCourses.includes(subcourseId);
    console.log('checkPurchase: Result:', { userId, subcourseId, purchased });

    return apiResponse(res, {
      success: true,
      message: 'Purchase check completed',
      data: { purchased },
      statusCode: 200,
    });
  } catch (error) {
    console.error('checkPurchase: Error occurred:', { error: error.message });
    return apiResponse(res, {
      success: false,
      message: `Failed to check purchase: ${error.message}`,
      statusCode: 500,
    });
  }
};