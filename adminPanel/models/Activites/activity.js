const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({

    activityTitle: {
        type: String,
        required: true
    },
    activityHeading: {
        type: String,
        required: true
    },
    activityDescription: {
        type: String,
        required: true
    },
    activityLink: {
        type: String,
        required: true
    },
    activityImage: {
        type: String,
        required: true
    }

}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);