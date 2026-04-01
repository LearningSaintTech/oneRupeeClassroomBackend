const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
   email: {
      type: String,
      required: true,
      unique: true,
      lowerCase: true,
      trim: true
   },
   otp: {
      type: String,
      required: true
   },

   type: {
      type: String,
      enum: ['register', 'login'],
      required: true
   },
   role: {
      type: String,
      default: "user"
   },
   isEmailVerified: {
      type: Boolean,
      default: false
   },

   expiresAt: {
      type: Date,
      required: true
   },
   isVerified: {
      type: Boolean,
      default: false,
   },
 { timestamps: true });
