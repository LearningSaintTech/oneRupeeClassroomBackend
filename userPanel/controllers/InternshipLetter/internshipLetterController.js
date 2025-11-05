const mongoose = require('mongoose');
const crypto = require('crypto');
const InternshipLetter = require('../../../adminPanel/models/InternshipLetter/internshipLetter');
const Course = require('../../../adminPanel/models/course/course');
const Subcourse = require("../../../adminPanel/models/course/subcourse");
const razorpayInstance = require('../../../config/razorpay');
const UserAuth = require("../../models/Auth/Auth")
const { apiResponse } = require('../../../utils/apiResponse');
const UsermainCourse = require('../../models/UserCourse/usermainCourse');
const NotificationService = require("../../../Notification/controller/notificationServiceController")
const { emitRequestInternshipLetter } = require('../../../socket/emitters');
const fs = require('fs');
const axios = require('axios');
const { emitBuyCourse } = require('../../../socket/emitters');
const jose = require('node-jose');
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

// Request Internship Letter and Create Razorpay Order
exports.requestInternshipLetter = async (req, res) => {
  try {
    const { subcourseId } = req.body;               // <-- subcourseId now
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, subcourseId: ${subcourseId}`);

    // ---------- 1. Validate subcourseId ----------
    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // ---------- 2. Sub-course exists ----------
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      return apiResponse(res, {
        success: false,
        message: 'Sub-course not found',
        statusCode: 404,
      });
    }

    // ---------- 3. User exists ----------
    const user = await UserAuth.findById(userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // ---------- 4. Price validation ----------
    const price = subcourse.internshipLetterPrice 
    if (!price || price <= 0) {
      return apiResponse(res, {
        success: false,
        message: 'Internship price not defined for this sub-course',
        statusCode: 400,
      });
    }

    // ---------- 5. Existing request ----------
    let internshipLetter = await InternshipLetter.findOne({ userId, subcourseId });
    if (internshipLetter && internshipLetter.paymentStatus === true) {
      return apiResponse(res, {
        success: false,
        message: 'Payment already completed for this internship letter request',
        statusCode: 400,
      });
    }

    // ---------- 6. Razorpay order ----------
    const receipt = `int_${userId.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;
    const razorpayOrder = await razorpayInstance.orders.create({
      amount: price * 100,          // paise
      currency: 'INR',
      receipt,
    });

    if (!razorpayOrder?.id) {
      return apiResponse(res, {
        success: false,
        message: 'Failed to create Razorpay order',
        statusCode: 500,
      });
    }

    // ---------- 7. Create / Update InternshipLetter ----------
    if (internshipLetter && internshipLetter.paymentStatus === false) {
      // reuse existing (failed/pending) request
      internshipLetter.razorpayOrderId = razorpayOrder.id;
      internshipLetter.paymentAmount = price;
      internshipLetter.paymentCurrency = 'INR';
      internshipLetter.uploadStatus = 'upload';
      internshipLetter.updatedAt = new Date();
      await internshipLetter.save();
    } else {
      internshipLetter = new InternshipLetter({
        userId,
        subcourseId,               // <-- store subcourseId
        paymentStatus: false,
        uploadStatus: 'upload',
        paymentAmount: price,
        paymentCurrency: 'INR',
        razorpayOrderId: razorpayOrder.id,
      });
      await internshipLetter.save();
    }

    // ---------- 8. Response ----------
    return apiResponse(res, {
      success: true,
      message: internshipLetter.isNew
        ? 'Internship letter request created successfully'
        : 'Internship letter request updated successfully',
      data: { internshipLetter, razorpayOrder },
      statusCode: 201,
    });
  } catch (error) {
    console.error('[ERROR] requestInternshipLetter:', error);
    return apiResponse(res, {
      success: false,
      message: `Server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Verify and Update Payment Status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { internshipLetterId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(internshipLetterId)) {
      return apiResponse(res, { success: false, message: 'Invalid internship letter ID', statusCode: 400 });
    }

    const internshipLetter = await InternshipLetter.findOne({ _id: internshipLetterId, userId });
    if (!internshipLetter) {
      return apiResponse(res, { success: false, message: 'Request not found or unauthorized', statusCode: 404 });
    }

    // Signature verification
    const expectedSignature = crypto
      .createHmac('sha256', razorpayInstance.key_secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return apiResponse(res, { success: false, message: 'Payment signature verification failed', statusCode: 400 });
    }

    // Mark paid
    internshipLetter.paymentStatus = true;
    internshipLetter.uploadStatus = 'upload';
    internshipLetter.razorpayPaymentId = razorpayPaymentId;
    internshipLetter.razorpaySignature = razorpaySignature;
    internshipLetter.paymentDate = new Date();
    await internshipLetter.save();

    // Notification data
    const subcourse = await Subcourse.findById(internshipLetter.subcourseId).select('subcourseName');
    const user = await UserAuth.findById(userId).select('fullName');

    const notificationData = {
      senderId: userId,
      title: 'Internship Letter upload request',
      body: `Upload internship letter Subcourse=${subcourse.subcourseName},User=${user.fullName}`,
      type: 'internship_letter_payment',
      data: {
        internshipLetterId: internshipLetter._id,
        subcourseId: internshipLetter.subcourseId,
        userId,
        Status: internshipLetter.uploadStatus,
        PaymentStatus: internshipLetter.paymentStatus,
      },
      createdAt: new Date(),
    };
    await NotificationService.sendAdminNotification(notificationData);

    // Socket emit (if io available)
    if (io) {
      emitRequestInternshipLetter(io, userId, {
        internshipLetterId: internshipLetter._id,
        subcourseId: internshipLetter.subcourseId,
        subcourseName: subcourse.subcourseName,
        userId,
        userName: user.fullName,
        status: internshipLetter.uploadStatus,
        paymentStatus: internshipLetter.paymentStatus,
        paymentDate: internshipLetter.paymentDate,
        createdAt: new Date().toISOString(),
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Payment verified and status updated successfully',
      data: internshipLetter,
      statusCode: 200,
    });
  } catch (error) {
    console.error('updatePaymentStatus error:', error);
    return apiResponse(res, { success: false, message: 'Server error', statusCode: 500 });
  }
};

//check internship-request status

exports.checkInternshipStatus = async (req, res) => {
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
          paymentStatus: true
      });

      // Fetch course to get appleInternshipProductId
      const course = await Course.findById(courseId).select('appleInternshipProductId');
      if (!course) {
          return apiResponse(res, {
              success: false,
              message: 'Course not found',
              statusCode: 404,
          });
      }

      // If no internship letter request exists, return response with course's appleInternshipProductId
      if (!internshipLetter) {
          return apiResponse(res, {
              success: true,
              message: 'No internship letter request found',
              data: {
                  isEnrolled: false,
                  uploadStatus: null,
                  internshipLetter: "",
                  appleInternshipProductId: course.appleInternshipProductId || null
              },
              statusCode: 200,
          });
      }

      // Return isEnrolled based on paymentStatus and include uploadStatus and course's appleInternshipProductId
      return apiResponse(res, {
          success: true,
          message: 'Internship status checked successfully',
          data: {
              isEnrolled: internshipLetter.paymentStatus === true,
              uploadStatus: internshipLetter.uploadStatus,
              internshipLetter: internshipLetter.internshipLetter,
              appleInternshipProductId: internshipLetter.appleInternshipProductId || course.appleInternshipProductId || null
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

// Verify Apple Internship Letter Payment
exports.verifyAppleInternshipLetter = async (req, res) => {
  try {
    const { signedTransaction, courseId } = req.body;
    const userId = req.userId;
    const io = req.app.get('io');

    console.log('verifyAppleInternshipLetter: Starting with inputs:', { userId, courseId });

    // Validate required fields
    if (!courseId) {
      console.log('verifyAppleInternshipLetter: Missing required fields:', { signedTransaction: !!signedTransaction, courseId });
      return apiResponse(res, {
        success: false,
        message: 'Missing required fields: courseId',
        statusCode: 400,
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      console.log('verifyAppleInternshipLetter: Invalid ObjectId:', { userId, courseId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or courseId',
        statusCode: 400,
      });
    }

    // Fetch course
    console.log('verifyAppleInternshipLetter: Fetching course with ID:', courseId);
    const course = await Course.findById(courseId);
    if (!course) {
      console.log('verifyAppleInternshipLetter: Course not found for ID:', courseId);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }
    console.log('verifyAppleInternshipLetter: Course fetched:', { courseId, courseName: course.courseName, appleInternshipProductId: course.appleInternshipProductId });

    // Fetch user
    console.log('verifyAppleInternshipLetter: Fetching user with ID:', userId);
    const user = await UserAuth.findById(userId);
    if (!user) {
      console.log('verifyAppleInternshipLetter: User not found:', { userId });
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if course is completed
    const userMainCourse = await UsermainCourse.findOne({ userId, courseId, isCompleted: true });
    if (!userMainCourse) {
      console.log('verifyAppleInternshipLetter: Course not completed:', { userId, courseId });
      return apiResponse(res, {
        success: false,
        message: 'Course not completed',
        statusCode: 403,
      });
    }

    // Check for existing internship letter request
    let internshipLetter = await InternshipLetter.findOne({ userId, courseId });
    if (internshipLetter && internshipLetter.paymentStatus === true) {
      console.log('verifyAppleInternshipLetter: Internship letter already paid:', { userId, courseId });
      return apiResponse(res, {
        success: true,
        message: 'Internship letter already purchased',
        data: { purchased: true, courseId, courseName: course.courseName },
        statusCode: 200,
      });
    }

    let payload;
    if (req.query.mock === 'true') {
      console.log('verifyAppleInternshipLetter: Using mock payload for testing');
      const mockProductId = course.appleInternshipProductId || 'com.yourapp.intern.dummy';  // Fallback for testing, assume course.appleInternshipProductId is set
      payload = {
        transactionId: `mock_intern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: mockProductId,
        purchaseDate: Date.now(),
      };
      console.log('verifyAppleInternshipLetter: Mock payload created:', { transactionId: payload.transactionId, productId: payload.productId });
    } else if (signedTransaction) {
      // Verify transaction using Apple's server-to-server verification
      console.log('verifyAppleInternshipLetter: Verifying receipt with Apple servers');
      const verificationResult = await verifyAppleReceiptWithServer(signedTransaction, false); // false for production (with auto-retry)
      
      if (!verificationResult.success) {
        console.log('verifyAppleInternshipLetter: Apple verification failed:', verificationResult.error);
        return apiResponse(res, {
          success: false,
          message: `Failed to verify Apple purchase: ${verificationResult.error}`,
          statusCode: 400,
        });
      }
      
      // Extract transaction data from Apple's response
      const receiptInfo = verificationResult.latestReceiptInfo;
      if (!receiptInfo || receiptInfo.length === 0) {
        console.log('verifyAppleInternshipLetter: No transactions found in receipt');
        return apiResponse(res, {
          success: false,
          message: 'No valid transactions found in receipt',
          statusCode: 400,
        });
      }
      
      // Find the transaction that matches the expected internship product ID
      const expectedProductId = course.appleInternshipProductId || 'com.yourapp.intern.dummy';
      console.log('verifyAppleInternshipLetter: Looking for product ID:', expectedProductId);
      console.log('verifyAppleInternshipLetter: Available transactions:', receiptInfo.map(t => ({ product_id: t.product_id, transaction_id: t.transaction_id })));
      
      // Find ALL internship transactions and get the LATEST one
      const internshipTransactions = receiptInfo.filter(transaction => 
        transaction.product_id === expectedProductId
      );
      
      console.log('verifyAppleInternshipLetter: Found internship transactions:', internshipTransactions.length);
      
      if (internshipTransactions.length === 0) {
        console.log('verifyAppleInternshipLetter: No internship transaction found in receipt');
        return apiResponse(res, {
          success: false,
          message: 'Internship purchase not found in receipt',
          statusCode: 400,
        });
      }
      
      // Get the LATEST internship transaction (highest transaction ID)
      const internshipTransaction = internshipTransactions.reduce((latest, current) => {
        return parseInt(current.transaction_id) > parseInt(latest.transaction_id) ? current : latest;
      });
      
      if (!internshipTransaction) {
        console.log('verifyAppleInternshipLetter: No internship transaction found in receipt');
        return apiResponse(res, {
          success: false,
          message: 'Internship purchase not found in receipt',
          statusCode: 400,
        });
      }
      
      payload = {
        transactionId: internshipTransaction.transaction_id,
        productId: internshipTransaction.product_id,
        purchaseDate: parseInt(internshipTransaction.purchase_date_ms),
        originalTransactionId: internshipTransaction.original_transaction_id,
        webOrderLineItemId: internshipTransaction.web_order_line_item_id
      };
      
      console.log('verifyAppleInternshipLetter: Apple verification successful:', { 
        transactionId: payload.transactionId, 
        productId: payload.productId,
        expectedProductId: expectedProductId,
        purchaseDate: new Date(payload.purchaseDate).toISOString(),
        totalTransactionsInReceipt: receiptInfo.length,
        internshipTransactionsFound: internshipTransactions.length
      });
    } else {
      console.log('verifyAppleInternshipLetter: Missing signedTransaction for real verification');
      return apiResponse(res, {
        success: false,
        message: 'Missing signedTransaction for verification',
        statusCode: 400,
      });
    }

    // Product ID validation is now handled during transaction filtering above
    // No need for additional product mismatch check since we already filtered for the correct product

    // Check if transaction already processed
    if (internshipLetter && internshipLetter.appleTransactionId === payload.transactionId) {
      console.log('verifyAppleInternshipLetter: Transaction already processed:', { transactionId: payload.transactionId });
      return apiResponse(res, {
        success: true,
        message: 'Internship letter purchase already verified',
        data: { purchased: true },
        statusCode: 200,
      });
    }

    // Create or update internshipLetter with Apple IAP details
    console.log('verifyAppleInternshipLetter: Updating/creating internshipLetter:', { userId, courseId });
    const paymentAmount = course.CourseInternshipPrice || 0;
    const paymentCurrency = 'INR'; // Apple IAP typically in USD

    if (!internshipLetter) {
      console.log('verifyAppleInternshipLetter: Creating new internshipLetter for:', { userId, courseId });
      internshipLetter = new InternshipLetter({
        userId,
        courseId,
        paymentStatus: true,
        uploadStatus: 'upload',
        appleTransactionId: payload.transactionId,
        paymentAmount,
        paymentCurrency,
        paymentDate: new Date(payload.purchaseDate || Date.now()),
      });
    } else {
      console.log('verifyAppleInternshipLetter: Updating existing internshipLetter:', { internshipLetterId: internshipLetter._id });
      internshipLetter.paymentStatus = true;
      internshipLetter.uploadStatus = 'upload';
      internshipLetter.appleTransactionId = payload.transactionId;
      internshipLetter.paymentAmount = paymentAmount;
      internshipLetter.paymentCurrency = paymentCurrency;
      internshipLetter.paymentDate = new Date(payload.purchaseDate || Date.now());
    }
    await internshipLetter.save();
    console.log('verifyAppleInternshipLetter: internshipLetter saved:', { internshipLetterId: internshipLetter._id, paymentStatus: internshipLetter.paymentStatus });

    // Fetch courseName and userName
    const courseName = course.courseName;
    const userName = user.fullName;

    // Send notification to admins
    const notificationData = {
        senderId: userId,
        title: 'Internship Letter upload request',
        body: `Upload internship letter Course=${courseName},UserName=${userName}`,
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
        console.log('verifyAppleInternshipLetter: Emitting request_internship_letter event to user:', userId);
        emitRequestInternshipLetter(io, userId, {
            internshipLetterId: internshipLetter._id,
            courseId: internshipLetter.courseId,
            courseName: courseName,
            userId: internshipLetter.userId,
            userName: userName,
            status: internshipLetter.uploadStatus,
            paymentStatus: internshipLetter.paymentStatus,
            paymentDate: internshipLetter.paymentDate,
            createdAt: new Date().toISOString()
        });
    } else {
        console.log('verifyAppleInternshipLetter: Socket.IO instance not found');
    }

    console.log('verifyAppleInternshipLetter: Apple IAP verification and internship letter request successful');
    return apiResponse(res, {
      success: true,
      message: 'Apple purchase verified and internship letter request unlocked successfully',
      data: {
        internshipLetter,
        purchased: true,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('verifyAppleInternshipLetter: Error occurred:', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: `Failed to verify Apple internship letter purchase: ${error.message}`,
      statusCode: 500,
    });
  }
};