const mongoose = require('mongoose');

const userlessonSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    lessonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "lesson",
        required: true,
    },
    isCompleted: {
        type: Boolean,
        default:false
    }
});

module.exports = mongoose.model('userlesson', userlessonSchema);