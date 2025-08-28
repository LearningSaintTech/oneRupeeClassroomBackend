const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
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
    subcourseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subcourse",
        required: true,
    },
    lessonName: {
        type: String,
        required: true
    },
    classLink: {
        type: String,
    },
    date: {
        type: Date,
        required: true
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    recordedVideoLink: {
        type: String,
    },
    introVideoUrl: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    LiveStatus: {
        type: Boolean,
        default: false
    },
    thumbnailImageUrl:{
        type:String
    }

},{timestamps:true});

module.exports = mongoose.model('lesson', lessonSchema);