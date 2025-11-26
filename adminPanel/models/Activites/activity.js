const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    
}, { timestamps: true });

module.exports = mongoose.model('internshipLetter', internshipLetterSchema);