const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "adminSchema",
            required: true,
    },
    courseName: {
        type: String,
        required: true
    },
    CoverImageUrl: {
        type: String,
        required: true
    },
},{timestamps:true});

module.exports = mongoose.model('course', courseSchema);