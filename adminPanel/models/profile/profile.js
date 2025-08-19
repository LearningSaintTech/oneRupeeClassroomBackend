// models/AdminProfile.js
const mongoose = require('mongoose');

const adminProfileSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'admin',
    index: true 
  },
  firstName:{
    type:String
  },
  lastName:{
    type:String
  },
  email: {
    type: String,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'] 
  },
  address: {
    type: String
  },
  state:{
    type: String
  },
  city:{
    type: String
  },
  pinCode:{
    type:Number
  },
  gender:{
    type:String,
  },
  dob: {
    type: Date
  },
  profileImageUrl: {
    type: String
  },
});

module.exports = mongoose.model('AdminProfile', adminProfileSchema);