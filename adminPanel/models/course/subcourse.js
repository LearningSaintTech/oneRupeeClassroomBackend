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
    avgRating: {
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
    isUpComingCourse: {
        type: Boolean,
        default: false
    },
    recordedlessonsLink: {
        type: String,
        default: ""
    },
    recordedlessonsPrice: {
        type: Number,
        default: 0
    },
    internshipLetterPrice: {
        type: Number,
        default: 1
    },
    appleProductId: {
        type: String,
        default: ""
    },
    appleCertificateProductId: {
        type: String,
        default: ""
    },
    appleRecordedProductId: {
        type: String,
        default: ""
    },
    appleInternshipProductId: {
        type: String,
        default: ""
    },
    isCertificateFree: {
        type: Boolean,
        default: false
    },
    isRecordedLessonFree: {
        type: Boolean,
        default: false
    },
    isInternshipLetterFree: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('subcourse', subcourseSchema);