const jwt = require('jsonwebtoken');
const User = require('../userPanel/models/Auth/Auth');
const Admin = require('../adminPanel/models/Auth/auth');
const { apiResponse } = require('../utils/apiResponse');

// Basic token verification (existing - works for both)
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return apiResponse(res, {
            success: false,
            message: 'No token provided',
            statusCode: 401
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return apiResponse(res, {
            success: false,
            message: 'Invalid or expired token',
            statusCode: 401
        });
    }
};

// User only - blocks admin
const verifyUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return apiResponse(res, {
            success: false,
            message: 'No token provided',
            statusCode: 401
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if it's an admin trying to access user route
        const admin = await Admin.findById(decoded.userId);
        if (admin) {
            return apiResponse(res, {
                success: false,
                message: 'Access denied. Only users can access this route',
                statusCode: 403
            });
        }

        // Check if user exists
        const user = await User.findById(decoded.userId);
        if (!user) {
            return apiResponse(res, {
                success: false,
                message: 'User not found',
                statusCode: 401
            });
        }

        req.userId = user._id;
        req.user = user;
        next();
    } catch (error) {
        return apiResponse(res, {
            success: false,
            message: 'Invalid or expired token',
            statusCode: 401
        });
    }
};

// Admin only - blocks user
const verifyAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return apiResponse(res, {
            success: false,
            message: 'No token provided',
            statusCode: 401
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if it's a user trying to access admin route
        const user = await User.findById(decoded.userId);
        if (user) {
            return apiResponse(res, {
                success: false,
                message: 'Access denied. Only admin can access this route',
                statusCode: 403
            });
        }

        // Check if admin exists
        const admin = await Admin.findById(decoded.userId);
        if (!admin) {
            return apiResponse(res, {
                success: false,
                message: 'Admin not found',
                statusCode: 401
            });
        }

        req.userId = admin._id;
        req.admin = admin;
        next();
    } catch (error) {
        return apiResponse(res, {
            success: false,
            message: 'Invalid or expired token',
            statusCode: 401
        });
    }
};

module.exports = { verifyToken, verifyUser, verifyAdmin };
