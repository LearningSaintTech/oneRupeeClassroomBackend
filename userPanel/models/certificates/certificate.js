const mongoose = require('mongoose');


const CertificatePaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: false },
    subcourseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcourse', required: false },
    paymentStatus: { type: Boolean, default: false },
    paymentAmount: { type: Number, required: true },
    paymentCurrency: { type: String, default: 'INR' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paymentDate: { type: Date },
    appleTransactionId: {
        type: String,
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CertificatePayment', CertificatePaymentSchema);