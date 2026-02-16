const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/db');

// Import models
const User = require('../userPanel/models/Auth/Auth');
const UserCourse = require('../userPanel/models/UserCourse/userCourse');
const Subcourse = require('../adminPanel/models/course/subcourse');

// User data from the spreadsheet
const usersData = [
  {
    name: 'Yogendra',
    email: 'yogendraykpk@gmail.com',
    contact: '7379353275',
    planPackage: 399,
    batchStartDate: '2025-12-08'
  },
  {
    name: 'Taruna Amrutha',
    email: 'amruthtaruna@gmail.com',
    contact: '8919268905',
    planPackage: 999,
    batchStartDate: '2025-12-08'
  },
  {
    name: 'Nitin',
    email: 'prajapatinitn096@gmail.com',
    contact: '7817085425',
    planPackage: 999,
    batchStartDate: '2025-12-08'
  },
  {
    name: 'Kr Priyanshu',
    email: 'priyanshu.rebel@gmail.com',
    contact: '8294903718',
    planPackage: 399,
    batchStartDate: '2025-12-08'
  },
  {
    name: 'Sushil Agarwal',
    email: 'Keyvedajyotish@gmail.com',
    contact: '7374044369',
    planPackage: 399,
    batchStartDate: '2025-12-08'
  },
  {
    name: 'Anil kewlani',
    email: 'kumkumdti@gmail.com',
    contact: '9838620051',
    planPackage: 399,
    batchStartDate: '2025-12-08'
  }
];

// Subcourse mapping based on price
const subcourseMapping = {
  399: '691eccaadc1aad7e304606a4', // Digital Marketing Fundamentals (price: 399)
  999: '691ecd23dc1aad7e3046081c'  // Digital Marketing With Recorded Lessons (price: 999)
};

async function addUsersToSubcourses() {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const userData of usersData) {
      try {
        // Format mobile number to match schema (+91XXXXXXXXXX)
        const formattedMobile = userData.contact.startsWith('+91') 
          ? userData.contact 
          : `+91${userData.contact}`;

        // Find or create user
        let user = await User.findOne({ mobileNumber: formattedMobile });
        
        if (!user) {
          // Create new user if doesn't exist
          user = new User({
            fullName: userData.name,
            mobileNumber: formattedMobile,
            isNumberVerified: true,
            role: 'user',
            isEmailVerified: false,
            purchasedsubCourses: []
          });
          await user.save();
          console.log(`✅ Created new user: ${userData.name} (${formattedMobile})`);
        } else {
          console.log(`ℹ️  Found existing user: ${userData.name} (${formattedMobile})`);
        }

        // Get subcourse ID based on plan package
        const subcourseId = subcourseMapping[userData.planPackage];
        if (!subcourseId) {
          throw new Error(`No subcourse mapping found for plan package: ${userData.planPackage}`);
        }

        // Find subcourse
        const subcourse = await Subcourse.findById(subcourseId);
        if (!subcourse) {
          throw new Error(`Subcourse not found with ID: ${subcourseId}`);
        }

        console.log(`📚 Assigning to subcourse: ${subcourse.subcourseName} (Price: ${subcourse.price})`);

        // Check if userCourse already exists
        let userCourse = await UserCourse.findOne({
          userId: user._id,
          subcourseId: subcourseId
        });

        const paymentDate = new Date(userData.batchStartDate);

        if (!userCourse) {
          // Create new userCourse entry
          userCourse = new UserCourse({
            userId: user._id,
            courseId: subcourse.courseId,
            subcourseId: subcourseId,
            isCompleted: false,
            progress: '0%',
            paymentStatus: true, // Mark as paid since they paid via QR Code
            paymentAmount: userData.planPackage,
            paymentCurrency: 'INR',
            paymentDate: paymentDate,
            razorpayOrderId: `QR_ORDER_${user._id}_${Date.now()}`,
            razorpayPaymentId: `QR_PAYMENT_${user._id}_${Date.now()}`,
            razorpaySignature: `QR_SIGNATURE_${user._id}_${Date.now()}`
          });
          await userCourse.save();
          results.created++;
          console.log(`✅ Created userCourse for ${userData.name}`);

          // Add subcourse to user's purchasedsubCourses if not already present
          if (!user.purchasedsubCourses.includes(subcourseId)) {
            user.purchasedsubCourses.push(subcourseId);
            await user.save();
            console.log(`✅ Added subcourse to user's purchasedsubCourses`);
          }

          // Increment totalStudentsEnrolled in subcourse
          subcourse.totalStudentsEnrolled += 1;
          await subcourse.save();
          console.log(`✅ Updated subcourse enrollment count: ${subcourse.totalStudentsEnrolled}`);
        } else {
          // Update existing userCourse
          userCourse.paymentStatus = true;
          userCourse.paymentAmount = userData.planPackage;
          userCourse.paymentDate = paymentDate;
          if (!userCourse.razorpayOrderId) {
            userCourse.razorpayOrderId = `QR_ORDER_${user._id}_${Date.now()}`;
          }
          if (!userCourse.razorpayPaymentId) {
            userCourse.razorpayPaymentId = `QR_PAYMENT_${user._id}_${Date.now()}`;
          }
          await userCourse.save();
          results.updated++;
          console.log(`✅ Updated existing userCourse for ${userData.name}`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${userData.name}:`, error.message);
        results.errors.push({
          user: userData.name,
          error: error.message
        });
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Created: ${results.created} userCourse entries`);
    console.log(`🔄 Updated: ${results.updated} userCourse entries`);
    console.log(`❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(err => {
        console.log(`  - ${err.user}: ${err.error}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
addUsersToSubcourses();

