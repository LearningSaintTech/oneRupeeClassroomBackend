const nodemailer = require('nodemailer');
const User = require('../../models/Auth/Auth');
const OTP = require('../../models/OTP/otp');
const { apiResponse } = require("../../../utils/apiResponse")


// Configure Nodemailer transporter (e.g., Gmail SMTP)
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email (set in .env)
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
});

console.log("dataa", process.env.EMAIL_USER, process.env.EMAIL_PASS)

// Generate a 6-digit OTP
const generateOTP = () => {
   return Math.floor(100000 + Math.random() * 900000).toString();

};

// Send OTP to email
exports.sendOTPEmail = async (req, res) => {
    try {
        const { email } = req.body;
        // Get user ID from middleware
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


        // Check if email is already verified
        if (user.isEmailVerified) {
            return apiResponse(res, {
                success: true,
                message: 'User already verified',
                statusCode: 200,
            });
        }



        // Check if email exists
        if (!email) {
            return apiResponse(res, {
                success: false,
                message: 'Email not provided for this user',
                statusCode: 400,
            });
        }

        // Generate OTP and set expiry (e.g., 10 minutes)
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Save OTP to database with user's email
        await OTP.create({
            email: email,
            otp,
            expiresAt,
        });

        // Send OTP via email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your OTP for Email Verification',
            text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
        };

        await transporter.sendMail(mailOptions);
        return apiResponse(res, {
            success: true,
            message: 'OTP sent to email',
            data: otp,
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

// Verify OTP
exports.verifyOTP = async (req, res) => {
    try {
        // Get user ID from middleware
        const userId = req.userId;
        if (!userId) {
            return apiResponse(res, {
                success: false,
                message: 'Unauthorized: User ID not found',
                statusCode: 401,
            });
        }

        // Find user by ID
        const user = await User.findById(userId);
        console.log("userData", user)

        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 401,
            });
        }

        const { email, otp } = req.body;
        console.log("data", email, otp)

        // Check if email exists
        if (!email && !otp) {
            return apiResponse(res, {
                success: false,
                message: 'Email or not provided',
                statusCode: 400,
            });
        }


        // Find OTP record
        const otpRecord = await OTP.findOne({ email: email, otp });
        if (!otpRecord) {
            return apiResponse(res, {
                success: false,
                message: 'Invalid or expired OTP',
                statusCode: 400,
            });
        }

        // Check if OTP is expired
        if (new Date() > otpRecord.expiresAt) {
            await OTP.deleteOne({ _id: otpRecord._id });
            return apiResponse(res, {
                success: false,
                message: 'OTP has expired',
                statusCode: 400,
            });
        }

        // Update isEmailVerified
        user.isEmailVerified = true;
        console.log(user.isEmailVerified)
        await user.save();

        // Delete OTP record after successful verification
        await OTP.deleteOne({ _id: otpRecord._id });

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

;