 const User = require('../../models/Auth/Auth');
const OTP = require('../../models/OTP/otp');
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../../../utils/apiResponse');
const {admin} = require('../../../config/firebase');
require('dotenv').config();

// Generate a 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Validate mobile number format (+91 followed by 10 digits)
const validateMobile = (mobileNumber) => {
  return /^\+91\d{10}$/.test(mobileNumber);
};

// Function to create and save OTP
const createOTP = async (mobileNumber) => {
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

  await OTP.deleteMany({ mobileNumber });

  const newOTP = new OTP({ mobileNumber, otp, expiresAt });
  await newOTP.save();

  console.log(`Generated OTP for ${mobileNumber}: ${otp}`);
  return otp; // For testing; remove in production
};

exports.register = async (req, res) => {
  const { mobileNumber, fullName } = req.body;

  if (!mobileNumber || !fullName) {
    return apiResponse(res, {
      success: false,
      message: 'Mobile number and full name are required',
      statusCode: 400,
    });
  }

  if (!validateMobile(mobileNumber)) {
    return apiResponse(res, {
      success: false,
      message: 'Mobile number must start with +91 and be followed by 10 digits',
      statusCode: 400,
    });
  }

  try {
    let user = await User.findOne({ mobileNumber });

    if (user) {
      if (user.isNumberVerified) {
        return apiResponse(res, {
          success: false,
          message: 'Mobile number already registered and verified',
          statusCode: 400,
        });
      }
      user.fullName = fullName;
      await user.save();
    } else {
      user = new User({ mobileNumber, fullName });
      await user.save();
    }

    const otp = await createOTP(mobileNumber);

    return apiResponse(res, {
      message: 'OTP sent for registration',
      data: { otp }, // Include OTP in response
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Server error',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.login = async (req, res) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) {
    return apiResponse(res, {
      success: false,
      message: 'Mobile number is required',
      statusCode: 400,
    });
  }

  if (!validateMobile(mobileNumber)) {
    return apiResponse(res, {
      success: false,
      message: 'Mobile number must start with +91 and be followed by 10 digits',
      statusCode: 400,
    });
  }

  try {
    const user = await User.findOne({ mobileNumber });

    if (!user || !user.isNumberVerified) {
      return apiResponse(res, {
        success: false,
        message: 'Mobile number not registered or not verified',
        statusCode: 400,
      });
    }

    const otp = await createOTP(mobileNumber);

    return apiResponse(res, {
      message: 'OTP sent for login',
      data: { otp }, // Include OTP in response
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Server error',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.verifyOTP = async (req, res) => {
  const { mobileNumber, otp } = req.body;

  if (!mobileNumber || !otp) {
    return apiResponse(res, {
      success: false,
      message: 'Mobile number and OTP are required',
      statusCode: 400,
    });
  }

  if (!validateMobile(mobileNumber)) {
    return apiResponse(res, {
      success: false,
      message: 'Mobile number must start with +91 and be followed by 10 digits',
      statusCode: 400,
    });
  }

  try {
    const otpRecord = await OTP.findOne({ mobileNumber, otp }).sort({ createdAt: -1 });

    if (!otpRecord || new Date() > otpRecord.expiresAt) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or expired OTP',
        statusCode: 400,
      });
    }

    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 400,
      });
    }

    if (!user.isNumberVerified) {
      user.isNumberVerified = true;
      await user.save();
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      { userId: user._id, mobileNumber: user.mobileNumber },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return apiResponse(res, {
      message: 'Mobile Number verified',
      data: { token },
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Server error',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

exports.resendOTP = async (req, res) => {
  const { mobileNumber } = req.body;

  if (!mobileNumber) {
    return apiResponse(res, {
      success: false,
      message: 'Mobile number is required',
      statusCode: 400,
    });
  }

  if (!validateMobile(mobileNumber)) {
    return apiResponse(res, {
      success: false,
      message: 'Mobile number must start with +91 and be followed by 10 digits',
      statusCode: 400,
    });
  }

  try {
    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'Mobile number not registered',
        statusCode: 400,
      });
    }

    const otp = await createOTP(mobileNumber);

    return apiResponse(res, {
      message: 'OTP resent',
      data: { otp }
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Server error',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};





//firebase



// Firebase Register
exports.firebaseRegister = async (req, res) => {
  const { mobileNumber, fullName } = req.body;
  console.log('firebaseRegister: Received request', { mobileNumber, fullName });

  if (!mobileNumber || !fullName) {
    console.log('firebaseRegister: Missing mobileNumber or fullName');
    return apiResponse(res, {
      success: false,
      message: 'Mobile number and full name are required',
      statusCode: 400,
    });
  }

  if (!validateMobile(mobileNumber)) {
    console.log('firebaseRegister: Invalid mobile number format', { mobileNumber });
    return apiResponse(res, {
      success: false,
      message: 'Mobile number must start with +91 and be followed by 10 digits',
      statusCode: 400,
    });
  }

  try {
    console.log('firebaseRegister: Querying MongoDB for user', { mobileNumber });
    let user = await User.findOne({ mobileNumber });

    if (user) {
      console.log('firebaseRegister: User found', { userId: user._id, isNumberVerified: user.isNumberVerified });
      if (user.isNumberVerified) {
        console.log('firebaseRegister: User already verified');
        return apiResponse(res, {
          success: false,
          message: 'Mobile number already registered and verified',
          statusCode: 400,
        });
      }
      user.fullName = fullName;
      console.log('firebaseRegister: Updating user fullName', { fullName });
      await user.save();
      console.log('firebaseRegister: User updated', { userId: user._id });
    } else {
      console.log('firebaseRegister: Creating new user', { mobileNumber, fullName });
      user = new User({ mobileNumber, fullName });
      await user.save();
      console.log('firebaseRegister: New user created', { userId: user._id });
    }

    // Create Firebase user (if not exists)
    console.log('firebaseRegister: Checking Firebase user', { mobileNumber });
    try {
      const firebaseUser = await admin.auth().getUserByPhoneNumber(mobileNumber);
      console.log('firebaseRegister: Firebase user exists', { uid: firebaseUser.uid });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('firebaseRegister: Creating Firebase user', { mobileNumber });
        const newFirebaseUser = await admin.auth().createUser({
          phoneNumber: mobileNumber,
        });
        console.log('firebaseRegister: Firebase user created', { uid: newFirebaseUser.uid });
      } else {
        console.log('firebaseRegister: Firebase error', { error: error.message });
        throw error;
      }
    }

    console.log('firebaseRegister: Registration successful, awaiting client-side OTP');
    return apiResponse(res, {
      message: 'User registered. Initiate phone authentication on client-side.',
      data: { mobileNumber },
    });
  } catch (error) {
    console.log('firebaseRegister: Server error', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: 'Server error',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Firebase Login
exports.firebaseLogin = async (req, res) => {
  const { mobileNumber } = req.body;
  console.log('firebaseLogin: Received request', { mobileNumber });

  if (!mobileNumber) {
    console.log('firebaseLogin: Missing mobileNumber');
    return apiResponse(res, {
      success: false,
      message: 'Mobile number is required',
      statusCode: 400,
    });
  }

  if (!validateMobile(mobileNumber)) {
    console.log('firebaseLogin: Invalid mobile number format', { mobileNumber });
    return apiResponse(res, {
      success: false,
      message: 'Mobile number must start with +91 and be followed by 10 digits',
      statusCode: 400,
    });
  }

  try {
    console.log('firebaseLogin: Querying MongoDB for user', { mobileNumber });
    const user = await User.findOne({ mobileNumber });

    if (!user || !user.isNumberVerified) {
      console.log('firebaseLogin: User not found or not verified', { mobileNumber, user });
      return apiResponse(res, {
        success: false,
        message: 'Mobile number not registered or not verified',
        statusCode: 400,
      });
    }

    console.log('firebaseLogin: Login successful, awaiting client-side OTP', { userId: user._id });
    return apiResponse(res, {
      message: 'Initiate phone authentication on client-side.',
      data: { mobileNumber },
    });
  } catch (error) {
    console.log('firebaseLogin: Server error', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: 'Server error',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// Firebase Verify OTP
exports.firebaseVerifyOTP = async (req, res) => {
  const { mobileNumber, idToken } = req.body;
  console.log('firebaseVerifyOTP: Received request', { mobileNumber, idToken: idToken.substring(0, 20) + '...' });

  if (!mobileNumber || !idToken) {
    console.log('firebaseVerifyOTP: Missing mobileNumber or idToken', { mobileNumber, idToken });
    return apiResponse(res, {
      success: false,
      message: 'Mobile number and ID token are required',
      statusCode: 400,
    });
  }

  if (!validateMobile(mobileNumber)) {
    console.log('firebaseVerifyOTP: Invalid mobile number format', { mobileNumber });
    return apiResponse(res, {
      success: false,
      message: 'Mobile number must start with +91 and be followed by 10 digits',
      statusCode: 400,
    });
  }

  try {
    // Verify ID token with Firebase Admin SDK
    console.log('firebaseVerifyOTP: Verifying ID token with Firebase');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('firebaseVerifyOTP: ID token verified', { uid: decodedToken.uid, phone_number: decodedToken.phone_number });

    if (decodedToken.phone_number !== mobileNumber) {
      console.log('firebaseVerifyOTP: Mobile number mismatch', { tokenPhone: decodedToken.phone_number, requestPhone: mobileNumber });
      return apiResponse(res, {
        success: false,
        message: 'Mobile number does not match the ID token',
        statusCode: 400,
      });
    }

    console.log('firebaseVerifyOTP: Querying MongoDB for user', { mobileNumber });
    const user = await User.findOne({ mobileNumber });

    if (!user) {
      console.log('firebaseVerifyOTP: User not found in MongoDB', { mobileNumber });
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 400,
      });
    }

    // Mark user as verified if not already
    if (!user.isNumberVerified) {
      console.log('firebaseVerifyOTP: Marking user as verified', { userId: user._id });
      user.isNumberVerified = true;
      await user.save();
      console.log('firebaseVerifyOTP: User verification status updated', { userId: user._id });
    }

    // Generate JWT
    console.log('firebaseVerifyOTP: Generating JWT', { userId: user._id, mobileNumber });
    const token = jwt.sign(
      { userId: user._id, mobileNumber: user.mobileNumber },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('firebaseVerifyOTP: JWT generated', { token: token });

    return apiResponse(res, {
      message: 'Mobile number verified',
      data: { token },
    });
  } catch (error) {
    console.log('firebaseVerifyOTP: ID token verification failed', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: 'Invalid or expired ID token',
      data: { error: error.message },
      statusCode: 400,
    });
  }
};

// Firebase Resend OTP
exports.firebaseResendOTP = async (req, res) => {
  const { mobileNumber } = req.body;
  console.log('firebaseResendOTP: Received request', { mobileNumber });

  if (!mobileNumber) {
    console.log('firebaseResendOTP: Missing mobileNumber');
    return apiResponse(res, {
      success: false,
      message: 'Mobile number is required',
      statusCode: 400,
    });
  }

  if (!validateMobile(mobileNumber)) {
    console.log('firebaseResendOTP: Invalid mobile number format', { mobileNumber });
    return apiResponse(res, {
      success: false,
      message: 'Mobile number must start with +91 and be followed by 10 digits',
      statusCode: 400,
    });
  }

  try {
    console.log('firebaseResendOTP: Querying MongoDB for user', { mobileNumber });
    const user = await User.findOne({ mobileNumber });

    if (!user) {
      console.log('firebaseResendOTP: User not found', { mobileNumber });
      return apiResponse(res, {
        success: false,
        message: 'Mobile number not registered',
        statusCode: 400,
      });
    }

    console.log('firebaseResendOTP: Initiating OTP resend', { userId: user._id });
    return apiResponse(res, {
      message: 'Initiate OTP resend on client-side.',
      data: { mobileNumber },
    });
  } catch (error) {
    console.log('firebaseResendOTP: Server error', { error: error.message, stack: error.stack });
    return apiResponse(res, {
      success: false,
      message: 'Server error',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};