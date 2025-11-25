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

// check internship-request status for subcourseId
exports.checkInternshipStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { subcourseId } = req.params; // Extract subcourseId from URL params

    // Validate subcourseId
    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Check if internship letter request exists for the user and subcourse
    const internshipLetter = await InternshipLetter.findOne({
      userId,
      subcourseId,
      paymentStatus: true,
    });

    // Fetch subcourse to get appleInternshipProductId (if needed)
    const subcourse = await Subcourse.findById(subcourseId).select('appleInternshipProductId');
    if (!subcourse) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // If no internship letter request exists
    if (!internshipLetter) {
      return apiResponse(res, {
        success: true,
        message: 'No internship letter request found',
        data: {
          isEnrolled: false,
          uploadStatus: null,
          internshipLetter: null,
          appleInternshipProductId: subcourse.appleInternshipProductId || null,
        },
        statusCode: 200,
      });
    }

    // Return status if paid
    return apiResponse(res, {
      success: true,
      message: 'Internship status checked successfully',
      data: {
        isEnrolled: internshipLetter.paymentStatus === true,
        uploadStatus: internshipLetter.uploadStatus || 'upload',
        internshipLetter: internshipLetter.internshipLetter || null,
        appleInternshipProductId: internshipLetter.appleInternshipProductId || subcourse.appleInternshipProductId || null,
        isInternshipLetterFree:subcourse.isInternshipLetterFree || null
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
    const { signedTransaction, subcourseId } = req.body;  // Changed to subcourseId
    const userId = req.userId;
    const io = req.app.get('io');

    console.log('verifyAppleInternshipLetterForSubcourse: Starting with inputs:', { userId, subcourseId });

    // Validate required fields
    if (!subcourseId) {
      return apiResponse(res, {
        success: false,
        message: 'Missing required field: subcourseId',
        statusCode: 400,
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Fetch subcourse
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    if (!subcourse.appleInternshipProductId) {
      return apiResponse(res, {
        success: false,
        message: 'Apple internship product ID not configured for this subcourse',
        statusCode: 400,
      });
    }

    // Fetch user
    const user = await UserAuth.findById(userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if subcourse is completed by user
    const userSubcourseProgress = await UserSubcourseProgress.findOne({
      userId,
      subcourseId,
      isCompleted: true,
    });

    if (!userSubcourseProgress) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not completed',
        statusCode: 403,
      });
    }

    // Check existing internship letter request
    let internshipLetter = await InternshipLetter.findOne({ userId, subcourseId });

    if (internshipLetter && internshipLetter.paymentStatus === true) {
      return apiResponse(res, {
        success: true,
        message: 'Internship letter already purchased',
        data: {
          purchased: true,
          subcourseId,
          subcourseName: subcourse.subcourseName,
        },
        statusCode: 200,
      });
    }

    let payload;

    // Mock mode for testing
    if (req.query.mock === 'true') {
      console.log('verifyAppleInternshipLetterForSubcourse: Using mock payload');
      payload = {
        transactionId: `mock_sub_intern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: subcourse.appleInternshipProductId,
        purchaseDate: Date.now(),
      };
    } else if (signedTransaction) {
      // Verify with Apple
      const verificationResult = await verifyAppleReceiptWithServer(signedTransaction, false);

      if (!verificationResult.success) {
        console.log('Apple verification failed:', verificationResult.error);
        return apiResponse(res, {
          success: false,
          message: `Apple receipt verification failed: ${verificationResult.error}`,
          statusCode: 400,
        });
      }

      const receiptInfo = verificationResult.latestReceiptInfo;
      if (!receiptInfo || receiptInfo.length === 0) {
        return apiResponse(res, {
          success: false,
          message: 'No transactions found in receipt',
          statusCode: 400,
        });
      }

      const expectedProductId = subcourse.appleInternshipProductId;
      const internshipTransactions = receiptInfo.filter(t => t.product_id === expectedProductId);

      if (internshipTransactions.length === 0) {
        return apiResponse(res, {
          success: false,
          message: 'No purchase found for this subcourse internship letter',
          statusCode: 400,
        });
      }

      // Get the latest transaction
      const latestTransaction = internshipTransactions.reduce((a, b) =>
        parseInt(b.transaction_id) > parseInt(a.transaction_id) ? b : a
      );

      payload = {
        transactionId: latestTransaction.transaction_id,
        productId: latestTransaction.product_id,
        purchaseDate: parseInt(latestTransaction.purchase_date_ms),
        originalTransactionId: latestTransaction.original_transaction_id,
      };

      console.log('Apple IAP verified for subcourse:', {
        subcourseId,
        subcourseName: subcourse.subcourseName,
        transactionId: payload.transactionId,
        productId: payload.productId,
      });
    } else {
      return apiResponse(res, {
        success: false,
        message: 'Missing signedTransaction',
        statusCode: 400,
      });
    }

    // Prevent duplicate processing
    if (internshipLetter && internshipLetter.appleTransactionId === payload.transactionId) {
      return apiResponse(res, {
        success: true,
        message: 'Purchase already processed',
        data: { purchased: true },
        statusCode: 200,
      });
    }

    // Create or update InternshipLetter
    const paymentAmount = subcourse.internshipLetterPrice || 0; // assuming you have this field
    const paymentCurrency = 'INR'; // or 'USD' depending on your Apple setup

    if (!internshipLetter) {
      internshipLetter = new InternshipLetter({
        userId,
        subcourseId,                    // Store subcourseId
        paymentStatus: true,
        uploadStatus: 'upload',
        appleTransactionId: payload.transactionId,
        paymentAmount,
        paymentCurrency,
        paymentDate: new Date(payload.purchaseDate),
      });
    } else {
      internshipLetter.paymentStatus = true;
      internshipLetter.uploadStatus = 'upload';
      internshipLetter.appleTransactionId = payload.transactionId;
      internshipLetter.paymentAmount = paymentAmount;
      internshipLetter.paymentCurrency = paymentCurrency;
      internshipLetter.paymentDate = new Date(payload.purchaseDate);
    }

    await internshipLetter.save();

    // Notification & Socket Emit
    const subcourseName = subcourse.subcourseName;
    const userName = user.fullName;

    const notificationData = {
      senderId: userId,
      title: 'Internship Letter upload request',
      body: `Upload internship letter Subcourse=${subcourseName}, User=${userName}`,
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

    if (io) {
      emitRequestInternshipLetter(io, userId, {
        internshipLetterId: internshipLetter._id,
        subcourseId: internshipLetter.subcourseId,
        subcourseName,
        userId,
        userName,
        status: internshipLetter.uploadStatus,
        paymentStatus: internshipLetter.paymentStatus,
        paymentDate: internshipLetter.paymentDate,
        createdAt: new Date().toISOString(),
      });
    }

    return apiResponse(res, {
      success: true,
      message: 'Apple purchase verified and internship letter request unlocked',
      data: {
        internshipLetter,
        purchased: true,
        subcourseName,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('verifyAppleInternshipLetterForSubcourse Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to verify Apple purchase: ${error.message}`,
      statusCode: 500,
    });
  }
};