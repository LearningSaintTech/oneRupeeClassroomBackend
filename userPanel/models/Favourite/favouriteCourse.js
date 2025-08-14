const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
        required: true
    },
    subcourseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subcourse",
        required: true
    },
    isLike: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Unique constraint to prevent duplicate favorites for the same user and subcourse
favouriteSchema.index({ userId: 1, subcourseId: 1 }, { unique: true });

module.exports = mongoose.model('Favourite', favouriteSchema);