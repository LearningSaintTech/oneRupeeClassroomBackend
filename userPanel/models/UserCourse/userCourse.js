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
},{timestamps: true});

module.exports = mongoose.model('userCourse', userCourseSchema);