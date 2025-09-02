const admin = require('../../models/Auth/auth');
const OTP = require('../../../userPanel/models/OTP/otp');
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../../../utils/apiResponse');
const FCMToken = require("../../../Notification/model/fcmToken");
require('dotenv').config();

const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// Validate mobile number (only allows fixed number)
const validateMobile = (mobileNumber) => {
    return mobileNumber === '+917042456533';
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
        let user = await admin.findOne({ mobileNumber });

        if (!user) {
            user = new admin({ mobileNumber });
            await user.save();
        }

        if (!user.isNumberVerified) {
            const otp = await createOTP(mobileNumber);
            return apiResponse(res, {
                message: 'OTP sent for login',
                data: { otp },
            });
        }

        const otp = await createOTP(mobileNumber);

        return apiResponse(res, {
            message: 'OTP sent for login',
            data: { otp },
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
        const otpRecord = await OTP.findOne({ mobileNumber, otp }).sort({ createdAt: -1 });

        if (!otpRecord || new Date() > otpRecord.expiresAt) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid or expired OTP',
                statusCode: 400,
            });
        }

        const user = await admin.findOne({ mobileNumber });

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
                await FCMToken.findOneAndUpdate(
                    { fcmToken },
                    {
                        userId: user._id,
                        deviceId,
                        isActive: true,
                        lastSeen: new Date()
                    },
                    { upsert: true, new: true }
                );
                console.log('🔔 [verifyOTP] FCM token saved successfully');
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
        const user = await admin.findOne({ mobileNumber });

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