const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
    },
    mobileNumber: {
        type: String,
        required: [true, 'Mobile number is required'],
        unique: true,
        validate: {
            validator: function (value) {
                return /^\+91\d{10}$/.test(value); // Validates +91 followed by 10 digits
            },
            message: 'Mobile number must start with +91 and be followed by 10 digits',
        },
    },
    isNumberVerified: {
        type: Boolean,
        default: false,
    },
    role:{
        type:String,
        default:"admin"
    }
});

module.exports = mongoose.model('admin', adminSchema);