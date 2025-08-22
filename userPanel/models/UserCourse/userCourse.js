const mongoose = require('mongoose');

const userCourseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "course",
        required: true,
    },
    subcourseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subcourse",
        required: true,
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    progress: {
        type: String,
        default: '0%'
    },
    paymentStatus: {
        type: Boolean,
        default: false
    },
    razorpayOrderId: {
        type: String,
        required: false,
    },
    razorpayPaymentId: {
        type: String,
        required: false,
    },
    razorpaySignature: {
        type: String,
        required: false,
    },
    paymentAmount: {
        type: Number,
        required: false,
    },
    paymentCurrency: {
        type: String,
        default: 'INR',
        required: false,
    },
    paymentDate: {
        type: Date,
        required: false,
    }
},{timestamps: true});

module.exports = mongoose.model('userCourse', userCourseSchema);