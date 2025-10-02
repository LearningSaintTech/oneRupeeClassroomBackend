const mongoose = require('mongoose');

const recordedlessonSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    subcourseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subcourse",
        required: true,
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
}, { timestamps: true });

module.exports = mongoose.model('recordedlesson', recordedlessonSchema);