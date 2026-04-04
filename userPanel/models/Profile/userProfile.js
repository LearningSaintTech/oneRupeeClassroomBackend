const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    profileImageUrl: {
        type: String,
    },
    email: {
        type: String,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Invalid email format']
    },
          // 👤 PROFILE
     gender: { type: String, enum: ["male", "female", "other"] },
     dateOfBirth: Date,
     bio: String,
      
        // 🎓 EDUCATION (VERY IMPORTANT FOR EDTECH)
        education: {
          highestQualification: String, // B.Tech, 12th, etc
          collegeName: String,
          fieldOfStudy: String,
          graduationYear: Number
        },
      
        // 🎯 LEARNING GOALS
        learningGoals: [
          String // e.g. "Get a job", "Learn React", "Crack UPSC"
        ],
      
        // 🧠 SKILLS
        skills: [String], // 
        // 
        // e.g. ["JavaScript", "Node.js"]
      
        // 📍 LOCATION
        address: {
          country: String,
          state: String,
          city: String
        },
          
      
        // ❤️ WISHLIST       
      
});

module.exports = mongoose.model('UserProfile', userProfileSchema);