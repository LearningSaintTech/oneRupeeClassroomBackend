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
        type: String
    },
    paymentStatus: {
        type: Boolean,
        default: false
    }
},{timestamps:true});

module.exports = mongoose.model('userCourse', userCourseSchema);