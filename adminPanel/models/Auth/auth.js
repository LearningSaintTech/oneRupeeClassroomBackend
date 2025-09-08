const mongoose = require("mongoose")


const adminSchema = new mongoose.Schema({
    mobileNumber: {
        type: String,
        required: [true, 'Mobile number is required'],
        unique: true,
        validate: {
            validator: function (value) {
                return value === '+911234567890'; // Validates only the fixed number
            },
            message: 'Invalid mobile number',
        },
    },
    isNumberVerified: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        default: "admin"
    }
});

module.exports = mongoose.model('admin', adminSchema);