const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subcourse",
        required: true,
    },
    address: {
        type: String,
    },
    email: {
        type: String,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Invalid email format']
    }
});

module.exports = mongoose.model('UserProfile', userProfileSchema);