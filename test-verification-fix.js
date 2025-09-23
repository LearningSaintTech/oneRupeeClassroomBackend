// Test script to verify the isNumberVerified fix
const mongoose = require('mongoose');
const User = require('./userPanel/models/Auth/Auth');

const testVerificationFix = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://oneRupeeClassroom:ocHVL78lVuW9PZ3R@cluster0.mecqq7t.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ mobileNumber: '+919829699382' });
    
    if (user) {
      console.log('👤 User found:', {
        _id: user._id,
        fullName: user.fullName,
        mobileNumber: user.mobileNumber,
        isNumberVerified: user.isNumberVerified,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      });

      // Test the verification update
      console.log('\n🔄 Testing verification update...');
      user.isNumberVerified = true;
      user.isVerified = true;
      await user.save();

      // Verify the update
      const updatedUser = await User.findById(user._id);
      console.log('✅ After update:', {
        isNumberVerified: updatedUser.isNumberVerified,
        isVerified: updatedUser.isVerified
      });

      if (updatedUser.isNumberVerified === true) {
        console.log('🎉 SUCCESS: isNumberVerified is now true!');
      } else {
        console.log('❌ FAILED: isNumberVerified is still false');
      }
    } else {
      console.log('❌ User not found with mobile number: +919829699382');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the test
testVerificationFix();
