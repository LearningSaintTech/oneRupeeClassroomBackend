const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
    },
    mobileNumber: {
        type: String,
        required: [true, 'Mobile number is required'],
        unique: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        validate: {
            validator: function (value) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); // Validates email
            },
            message: 'Email must be a valid email address',
        },
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        default: "user"
    },
    
    purchasedsubCourses:
        [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "subcourse"
            }

        ]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);