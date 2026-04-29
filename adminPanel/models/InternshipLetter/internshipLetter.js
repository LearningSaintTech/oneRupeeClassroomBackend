const mongoose = require('mongoose');

const internshipLetterSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    subcourseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "course",
        required: true,
    },
    internshipLetter: {
        type: String,
        default: ""
    },
    paymentStatus: {
        type: Boolean,
        default: false
    },
    uploadStatus: {
        type: String,
        enum: ["upload", "uploaded"],
        default: "upload"
    },
    stripePaymentIntentId: {
        type: String,
        required: false,
    },
    stripeChargeId: {
        type: String,
        required: false,
    },
    stripePaymentMethodId: {
        type: String,
        required: false,
    },
    paymentAmount: {
        type: Number,
        required: false,
    },
    paymentCurrency: {
        type: String,
        default: 'USD',
        required: false,
    },
    paymentDate: {
        type: Date,
        required: false,
    },
    appleTransactionId: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('internshipLetter', internshipLetterSchema);