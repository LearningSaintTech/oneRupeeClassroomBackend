const mongoose = require('mongoose');

const subcourseSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "adminSchema",
        required: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "course",
        required: true,
    },
    subcourseName: {
        type: String,
        required: true
    },
    subCourseDescription: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        default: 1
    },
    certificateUrl: {
        type: String,
        required: true
    },
    certificatePrice: {
        type: Number,
        required: true
    },
    certificateDescription: {
        type: String,
        required: true
    },
    introVideoUrl: {
        type: String,
        required: true
    },
    totalLessons: {
        type: Number,
        required: true
    },
    totalStudentsEnrolled: {
        type: Number,
        default: 0
    },
    totalDuration: {
        type: String,
        default: '0'
    },
    rating: {
        type: Number,
        default: 0
    },
    LiveStatus: {
        type: Boolean,
        default: false
    },
    thumbnailImageUrl: {
        type: String
    },
    isbestSeller: {
        type: Boolean,
        default: false
    },
    userRatings: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: 0,
            max: 5
        }
    }],
    totalRatings: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('subcourse', subcourseSchema);