const nodemailer = require('nodemailer');
const User = require('../../models/Auth/Auth');
const userProfile = require("../../models/Profile/userProfile")
const OTP = require('../../models/OTP/otp');
const { apiResponse } = require("../../../utils/apiResponse")

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});


// Generate a 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Customized email template
const generateEmailTemplate = (otp) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .header { background: #007bff; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; text-align: center; }
            .otp { font-size: 24px; font-weight: bold; color: #333; margin: 20px 0; }
            .note { color: #666; font-size: 14px; }
            .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Email Verification</h2>
            </div>
            <div class="content">
                <h3>Your One-Time Password (OTP)</h3>
                <p class="otp">${otp}</p>
                <p>Use this code to verify your email address. This OTP is valid for <strong>1 minute</strong>.</p>
                <p class="note">If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Learning Saint. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

// Send OTP to email
exports.sendOTPEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const userId = req.userId;
        if (!userId) {
            return apiResponse(res, {
                success: false,
                message: 'Unauthorized: User ID not found',
                statusCode: 401,
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 401,
            });
        }

        if (user.isEmailVerified) {
            return apiResponse(res, {
                success: true,
                message: 'User already verified',
                statusCode: 200,
            });
        }

        if (!email) {
            return apiResponse(res, {
                success: false,
                message: 'Email not provided for this user',
                statusCode: 400,
            });
        }

        // Generate OTP and set expiry to 1 minute
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

        // Save OTP to database with user's email
        await OTP.create({
            email: email,
            otp,
            expiresAt,
        });

        // Send OTP via email with custom template
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for Email Verification',
            html: generateEmailTemplate(otp),
        };

        await transporter.sendMail(mailOptions);
        return apiResponse(res, {
            success: true,
            message: 'OTP sent to email',
            data: { email }, // Avoid sending OTP in response for security
            statusCode: 200
        });
    } catch (error) {
        console.error('Error sending OTP:', error);
        return apiResponse(res, {
            success: false,
            message: 'Error sending OTP',
            data: { error: error.message },
            statusCode: 500,
        });
    }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const userId = req.userId;
        if (!userId) {
            return apiResponse(res, {
                success: false,
                message: 'Unauthorized: User ID not found',
                statusCode: 401,
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 401,
            });
        }

        if (user.isEmailVerified) {
            return apiResponse(res, {
                success: true,
                message: 'User already verified',
                statusCode: 200,
            });
        }

        if (!email) {
            return apiResponse(res, {
                success: false,
                message: 'Email not provided',
                statusCode: 400,
            });
        }

        // Delete any existing OTP for this email
        await OTP.deleteMany({ email });

        // Generate new OTP and set expiry to 1 minute
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 1 * 60 * 1000);

        // Save new OTP to database
        await OTP.create({
            email: email,
            otp,
            expiresAt,
        });

        // Send new OTP via email with custom template
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'New OTP for Email Verification',
            html: generateEmailTemplate(otp),
        };

        await transporter.sendMail(mailOptions);
        return apiResponse(res, {
            success: true,
            message: 'New OTP sent to email',
            data: { email },
            statusCode: 200
        });
    } catch (error) {
        console.error('Error resending OTP:', error);
        return apiResponse(res, {
            success: false,
            message: 'Error resending OTP',
            data: { error: error.message },
            statusCode: 500,
        });
    }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return apiResponse(res, {
                success: false,
                message: 'Unauthorized: User ID not found',
                statusCode: 401,
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 401,
            });
        }

        const { email, otp } = req.body;
        if (!email || !otp) {
            return apiResponse(res, {
                success: false,
                message: 'Email or OTP not provided',
                statusCode: 400,
            });
        }

        const otpRecord = await OTP.findOne({ email: email, otp });

        if (!otpRecord) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid or expired OTP',
                statusCode: 400,
            });
        }



        // Update isEmailVerified
        user.isEmailVerified = true;
        await user.save();

        // Delete OTP record after successful verification
        await OTP.deleteOne({ _id: otpRecord._id });

        // Update userProfile email
        await userProfile.findOneAndUpdate(
            { userId: userId },
            { email: email },
        );

        return apiResponse(res, {
            success: true,
            message: 'Email verified successfully',
            data: { isEmailVerified: user.isEmailVerified },
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return apiResponse(res, {
            success: false,
            message: 'Error verifying OTP',
            data: { error: error.message },
            statusCode: 500,
        });
    }
};