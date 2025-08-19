const mongoose = require('mongoose');

const usermainCourseSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ["Course Pending","Certified Learner","Course Completed"],
        default:"Course Pending"
    },
    isCompleted:{
        type:Boolean,
        default:false
    },
    isCertificateDownloaded:{
        type: Boolean,
        default:false
    }
},{timestamps:true});

module.exports = mongoose.model('usermainCourse', usermainCourseSchema);