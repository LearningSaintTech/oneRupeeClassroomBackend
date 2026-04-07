const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    profileImageUrl: {
        type: String,
        required: true,
    },

 

    // 👤 PROFILE
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: "other"
    },

    dateOfBirth: {
        type: Date,
        default: null
    },

    bio: {
        type: String,
        default: "",
    },

    // 🎓 EDUCATION
    education: {
        highestQualification: {
            type: String,
            default: ""
        },
        collegeName: {
            type: String,
            default: ""
        },
        fieldOfStudy: {
            type: String,
            default: ""
        },
        graduationYear: {
            type: Number,
            default: null
        }
    },

    // 🎯 LEARNING GOALS
    learningGoals: {
        type: [String],
        default: []
    },

    // 🧠 SKILLS
    skills: {
        type: [String],
        default: []
    },

    // 📍 LOCATION
    address: {
        country: {
            type: String,
            default: ""
        },
        state: {
            type: String,
            default: ""
        },
        city: {
            type: String,
            default: ""
        }
    }

}, { timestamps: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);