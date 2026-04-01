const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../../../userPanel/models/Auth/Auth');
const OTP = require('../../../userPanel/models/OTP/otp');
const RefreshToken = require('../../../userPanel/models/Auth/refreshToken');
const { generateAccessToken, generateRefreshToken } = require('../../../utils/jwt');
const { apiResponse } = require('../../../utils/apiResponse');
const { buildAuthOtpTemplate } = require('../../utils/emailTemplates/authOtpTemplate');

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Basic email validation
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (email, otp, purpose) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Your OTP for ${purpose}`,
    text: `Your OTP for ${purpose} is ${otp}. It is valid for 5 minutes.`,
    html: buildAuthOtpTemplate({ otp, purpose }),
  };

  await transporter.sendMail(mailOptions);
};

// Hash refresh token before storing in DB
const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

const getDeviceId = (req) => {
  const raw =
    req.body?.deviceId ||
    req.body?.deviceid ||
    req.headers['x-device-id'] ||
    req.headers['deviceid'] ||
    req.headers['deviceId'];
  if (raw === undefined || raw === null) return 'web';
  const normalized = String(raw).trim();
  if (!normalized) return 'web';
  return normalized;
};

// POST /user-auth/register/email
exports.register = async (req, res) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName || typeof fullName !== 'string') {
      return apiResponse(res, {
        success: false,
        message: 'Full name is required',
        statusCode: 400,
      });
    }

    if (!isValidEmail(email)) {
      return apiResponse(res, {
        success: false,
        message: 'Valid email is required',
        statusCode: 400,
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: trimmedEmail });

    if (user && user.isEmailVerified) {
      return apiResponse(res, {
        success: false,
        message: 'Email already registered and verified. Please login.',
        statusCode: 400,
      });
    }

    if (user) {
      user.fullName = fullName;
      await user.save();
    } else {
      user = new User({ fullName, email: trimmedEmail });
      await user.save();
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Prevent spam: remove old OTPs for this email
    await OTP.deleteMany({ email: trimmedEmail });

    await OTP.create({
      email: trimmedEmail,
      otp,
      expiresAt,
    });

    await sendOtpEmail(trimmedEmail, otp, 'email registration');

    return apiResponse(res, {
      success: true,
      message: 'OTP sent for email registration',
      data: { email: trimmedEmail },
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error sending registration OTP',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// POST /user-auth/login/email
exports.login = async (req, res) => {
  try {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return apiResponse(res, {
        success: false,
        message: 'Valid email is required',
        statusCode: 400,
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: trimmedEmail });

    if (!user || !user.isEmailVerified) {
      return apiResponse(res, {
        success: false,
        message: 'Email not registered or not verified',
        statusCode: 400,
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email: trimmedEmail });

    await OTP.create({
      email: trimmedEmail,
      otp,
      expiresAt,
    });

    await sendOtpEmail(trimmedEmail, otp, 'email login');

    return apiResponse(res, {
      success: true,
      message: 'OTP sent for email login',
      data: { email: trimmedEmail },
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error sending login OTP',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};



exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const deviceId = getDeviceId(req);
    const normalizedOtp = String(otp || '').trim();

    // ✅ Validation
    if (!isValidEmail(email) || !normalizedOtp) {
      return apiResponse(res, {
        success: false,
        message: 'Email and OTP are required',
        statusCode: 400,
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // ✅ Get latest OTP for this email
    const otpRecord = await OTP.findOne({ email: trimmedEmail }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return apiResponse(res, {
        success: false,
        message: 'No OTP found for this email. Please request OTP first.',
        statusCode: 400,
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      return apiResponse(res, {
        success: false,
        message: 'OTP expired. Please resend OTP.',
        statusCode: 400,
      });
    }

    if (String(otpRecord.otp).trim() !== normalizedOtp) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid OTP',
        statusCode: 400,
      });
    }

    // ✅ Find user
    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 400,
      });
    }

    // ✅ Verify email
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    // ✅ Delete OTP after success
    await OTP.deleteOne({ _id: otpRecord._id });

    // ✅ Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // ✅ Store refresh token (hashed)
    const refreshHash = hashToken(refreshToken);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Upsert refresh session for this device
    await RefreshToken.findOneAndUpdate(
      { userId: user._id, deviceId },
      { token: refreshHash, expiresAt: refreshExpiry },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return apiResponse(res, {
      success: true,
      message: 'Email verified successfully',
      data: {
        email: trimmedEmail,
        isEmailVerified: user.isEmailVerified,
        accessToken,
        refreshToken,
        role: user.role,
      },
      statusCode: 200,
    });

  } catch (error) {
    console.error("❌ Verify OTP Error:", error);

    return apiResponse(res, {
      success: false,
      message: 'Error verifying OTP',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};

// POST /user-auth/refresh-token
exports.refreshTokenHandler = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    console.log( "refreshToken", refreshToken);
    const deviceId = getDeviceId(req);
    console.log( "deviceId", deviceId);         
    if (!refreshToken) {
      console.log( "Refresh token is required");
      return apiResponse(res, {  
        success: false,
        message: 'Refresh token is required',
        statusCode: 400,
      });
    }

    // Verify JWT structure/signature
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_SECRET || process.env.JWT_SECRET
    );

    const tokenHash = hashToken(refreshToken);

    let stored = await RefreshToken.findOne({
      userId: decoded.userId,
      token: tokenHash,
      deviceId,
    });

    // Fallback for older sessions where deviceId might differ/missing
    if (!stored) {
      stored = await RefreshToken.findOne({
        userId: decoded.userId,
        token: tokenHash,
      });
    }

    if (!stored || new Date() > stored.expiresAt) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid or expired refresh token',
        statusCode: 401,
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 401,
      });
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    const newHash = hashToken(newRefreshToken);
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    stored.token = newHash;
    stored.expiresAt = newExpiry;
    stored.deviceId = deviceId;
    await stored.save();

    return apiResponse(res, {
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        role: user.role,
      },
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Invalid or expired refresh token',
      data: { error: error.message },
      statusCode: 401,
    });
  }
};

// POST /user-auth/resend-otp/email
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return apiResponse(res, {
        success: false,
        message: 'Valid email is required',
        statusCode: 400,
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: trimmedEmail });

    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'Email not registered',
        statusCode: 400,
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({ email: trimmedEmail });

    await OTP.create({
      email: trimmedEmail,
      otp,
      expiresAt,
    });

    await sendOtpEmail(trimmedEmail, otp, 'resend email OTP');

    return apiResponse(res, {
      success: true,
      message: 'OTP resent successfully',
      data: { email: trimmedEmail },
      statusCode: 200,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error resending OTP',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};
exports.logoutHandler = async(req,res) =>{
   try{
      const {refreshToken} = req.body || {};
     if(!refreshToken){
      return apiResponse(res, {
         success: false,
         message: 'Refresh token is required',
         statusCode: 400,
      });
     }
     const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || process.env.JWT_SECRET);
     const tokenHash = hashToken(refreshToken);
     const stored = await RefreshToken.findOne({
      userId: decoded.userId,
      token: tokenHash,
     });
     if(!stored){
      return apiResponse(res, {
        success: false,
        message: 'Invalid or expired refresh token',
        statusCode: 401,
      });
     }
     // Logout only this device session
     await RefreshToken.deleteOne({ _id: stored._id });
     return apiResponse(res, {
      success: true,
      message: 'Logged out successfully',
      statusCode: 200,
     });
   }
   catch(error){
      return apiResponse(res, {
         success: false,
         message: 'Error logging out',
         data: { error: error.message },
         statusCode: 500,
      });
   }
   
}
