const Admin = require('../../models/Auth/auth'); // Capitalized for convention
const OTP = require('../../../userPanel/models/OTP/otp');
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../../../utils/apiResponse');
const FCMToken = require('../../../Notification/model/fcmToken');
require('dotenv').config();

// Hardcoded OTP for testing
const generateOTP = () => {
    return '1234'; // Hardcoded OTP as requested
};

// Validate mobile number (only allows fixed number)
const validateMobile = (mobileNumber) => {
    return mobileNumber === '+911234567890';
};

// Function to create and save OTP
const createOTP = async (mobileNumber) => {
    const otp = generateOTP(); // Will always return '1234'
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    await OTP.deleteMany({ mobileNumber });

    const newOTP = new OTP({ mobileNumber, otp, expiresAt });
    await newOTP.save();

    console.log(`Generated OTP for ${mobileNumber}: ${otp}`); // For testing
    return otp; // For testing; remove in production
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
            message: 'Invalid mobile number',
            statusCode: 400,
        });
    }

    try {
        let user = await Admin.findOne({ mobileNumber });

        if (!user) {
            user = new Admin({ mobileNumber });
            await user.save();
        }

        const otp = await createOTP(mobileNumber); // OTP will be '1234'

        return apiResponse(res, {
            message: 'OTP sent for login',
            data: { otp }, // Returning OTP for testing
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
    const { mobileNumber, otp, fcmToken, deviceId } = req.body;

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
            message: 'Invalid mobile number',
            statusCode: 400,
        });
    }

    try {
        const otpRecord = await OTP.findOne({ mobileNumber, otp: otp.toString() }).sort({ createdAt: -1 });

        if (!otpRecord || new Date() > otpRecord.expiresAt) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid or expired OTP',
                statusCode: 400,
            });
        }

        const user = await Admin.findOne({ mobileNumber });

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

        // Save FCM token if provided
        if (fcmToken && deviceId) {
            try {
                console.log('🔔 [verifyOTP] Saving FCM token for admin:', user._id);
                const result = await FCMToken.findOneAndUpdate(
                    { userId: user._id },
                    {
                        $addToSet: {
                            tokens: {
                                fcmToken,
                                deviceId,
                                isActive: true,
                                lastSeen: new Date(),
                            },
                        },
                    },
                    {
                        upsert: true,
                        new: true,
                        runValidators: true,
                    }
                );
                console.log('🔔 [verifyOTP] FCM token saved successfully:', {
                    userId: user._id,
                    tokenCount: result.tokens.length,
                    lastAddedToken: fcmToken,
                });
            } catch (fcmError) {
                console.error('🔔 [verifyOTP] Error saving FCM token:', fcmError);
            }
        }

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
            message: 'Invalid mobile number',
            statusCode: 400,
        });
    }

    try {
        const user = await Admin.findOne({ mobileNumber });

        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'Mobile number not registered',
                statusCode: 400,
            });
        }

        const otp = await createOTP(mobileNumber); // OTP will be '1234'

        return apiResponse(res, {
            message: 'OTP resent',
            data: { otp }, // Returning OTP for testing
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