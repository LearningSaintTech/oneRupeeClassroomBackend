const mongoose = require('mongoose');


const CertificatePaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: false },
    subcourseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subcourse', required: false },
    paymentStatus: { type: Boolean, default: false },
    paymentAmount: { type: Number, required: true },
    paymentCurrency: { type: String, default: 'USD' },
    stripePaymentIntentId: { type: String },
    stripeChargeId: { type: String },
    stripePaymentMethodId: { type: String },
    paymentDate: { type: Date },
    appleTransactionId: {
        type: String,
    },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CertificatePayment', CertificatePaymentSchema);