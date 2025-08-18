const mongoose = require('mongoose');

const ratingeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    subcourseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subcourse",
        required: true,
    },
    rating: {
        type: Number,
    }
});

module.exports = mongoose.model('rating', ratingeSchema);