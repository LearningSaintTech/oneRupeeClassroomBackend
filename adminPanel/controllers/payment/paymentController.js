const mongoose = require('mongoose');
const { apiResponse } = require('../../../utils/apiResponse');
const UserCourse = require('../../../userPanel/models/UserCourse/userCourse');

// GET /admin/payments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&limit=20
// Fetch all users with completed payments, include user details and payment date, with optional date range filter
exports.getCompletedPayments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const { startDate, endDate } = req.query;

        // Build match conditions
        const match = {
            paymentStatus: true,
        };

        // Only include records that have a paymentDate if filtering or to show payment info
        // If a date filter is passed, convert to range on paymentDate (inclusive)
        if (startDate || endDate) {
            const dateRange = {};
            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    dateRange.$gte = start;
                }
            }
            if (endDate) {
                const end = new Date(endDate);
                if (!isNaN(end.getTime())) {
                    // Set time to end of day for inclusivity
                    end.setHours(23, 59, 59, 999);
                    dateRange.$lte = end;
                }
            }
            if (Object.keys(dateRange).length > 0) {
                match.paymentDate = dateRange;
            }
        }

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $sort: { paymentDate: -1, createdAt: -1 },
            },
            {
                $facet: {
                    data: [ { $skip: skip }, { $limit: limit } ],
                    totalCount: [ { $count: 'count' } ],
                },
            },
        ];

        const result = await UserCourse.aggregate(pipeline);
        const data = (result[0] && result[0].data) || [];
        const total = (result[0] && result[0].totalCount[0] && result[0].totalCount[0].count) || 0;

        // Shape response
        const formatted = data.map((doc) => ({
            userId: doc.userId,
            fullName: doc.user.fullName,
            mobileNumber: doc.user.mobileNumber,
            courseId: doc.courseId,
            subcourseId: doc.subcourseId,
            paymentDate: doc.paymentDate,
            paymentAmount: doc.paymentAmount || null,
            paymentCurrency: doc.paymentCurrency || 'INR',
            razorpayOrderId: doc.razorpayOrderId || null,
            razorpayPaymentId: doc.razorpayPaymentId || null,
            razorpaySignature: doc.razorpaySignature || null,
            appleTransactionId: doc.appleTransactionId || null,
            createdAt: doc.createdAt,
        }));

        return apiResponse(res, {
            success: true,
            message: 'Completed payments fetched successfully',
            data: {
                payments: formatted,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit) || 0,
                    totalItems: total,
                    limit,
                },
                filters: { startDate: startDate || null, endDate: endDate || null },
            },
            statusCode: 200,
        });
    } catch (error) {
        console.error('Error fetching completed payments:', error);
        return apiResponse(res, {
            success: false,
            message: `Error fetching completed payments: ${error.message}`,
            statusCode: 500,
        });
    }
};

