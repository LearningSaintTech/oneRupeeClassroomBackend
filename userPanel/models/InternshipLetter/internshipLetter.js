const mongoose = require('mongoose');

const internshipLetterSchema = new mongoose.Schema({
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
    internshipLetter:{
        type:String
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

module.exports = mongoose.model('internshipLetterSchema', internshipLetterSchema);