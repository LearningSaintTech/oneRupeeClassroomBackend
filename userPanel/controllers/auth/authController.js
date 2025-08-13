 const User = require('../../models/Auth/Auth');
const OTP = require('../../models/OTP/otp');
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../../../utils/apiResponse');
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
      { expiresIn: '1h' }
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