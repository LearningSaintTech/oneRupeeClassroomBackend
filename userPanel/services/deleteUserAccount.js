const mongoose = require('mongoose');
const UserAuth = require('../models/Auth/Auth');
const UserProfile = require('../models/Profile/userProfile');
const UserCourse = require('../models/UserCourse/userCourse');
const UserLesson = require('../models/UserCourse/userLesson');
const UserMainCourse = require('../models/UserCourse/usermainCourse');
const Notification = require('../../Notification/model/notification');
const Rating = require('../models/Rating/rating');
const Favourite = require('../models/Favourite/favouriteCourse');
const FCMToken = require('../../Notification/model/fcmToken');
const RefreshToken = require('../models/Auth/refreshToken');
const CertificatePayment = require('../models/certificates/certificate');
const RecordedLesson = require('../models/recordedLesson/recordedLesson');
const InternshipLetter = require('../../adminPanel/models/InternshipLetter/internshipLetter');
const OTP = require('../models/OTP/otp');
const { deleteImage } = require('../../utils/s3Functions');

/**
 * Permanently deletes a user and associated data by MongoDB user id.
 * @returns {{ deleted: boolean, reason?: string }}
 */
async function deleteUserAccountById(userId) {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return { deleted: false, reason: 'invalid_user_id' };
  }

  const user = await UserAuth.findById(userId);
  if (!user) {
    return { deleted: false, reason: 'user_not_found' };
  }

  const userProfile = await UserProfile.findOne({ userId });
  if (userProfile?.profileImageUrl) {
    try {
      await deleteImage(userProfile.profileImageUrl);
    } catch (err) {
      console.warn('[deleteUserAccount] S3 profile image delete failed:', err.message);
    }
  }

  const userEmail = user.email;

  await Promise.all([
    UserCourse.deleteMany({ userId }),
    UserLesson.deleteMany({ userId }),
    UserMainCourse.deleteMany({ userId }),
    Notification.deleteMany({
      $or: [{ recipientId: userId }, { senderId: userId }],
    }),
    Rating.deleteMany({ userId }),
    Favourite.deleteMany({ userId }),
    FCMToken.deleteMany({ userId }),
    RefreshToken.deleteMany({ userId }),
    CertificatePayment.deleteMany({ userId }),
    RecordedLesson.deleteMany({ userId }),
    InternshipLetter.deleteMany({ userId }),
    UserProfile.deleteOne({ userId }),
  ]);

  if (userEmail) {
    await OTP.deleteMany({ email: userEmail });
  }
  if (user.mobileNumber) {
    await OTP.deleteMany({ mobileNumber: user.mobileNumber });
  }

  await UserAuth.deleteOne({ _id: userId });

  return { deleted: true };
}

/**
 * Resolves user by email (case-insensitive trim).
 */
async function findUserIdByEmail(email) {
  const trimmed = (email || '').trim();
  if (!trimmed) return null;
  const user = await UserAuth.findOne({
    email: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
  }).select('_id');
  return user?._id?.toString() || null;
}

module.exports = {
  deleteUserAccountById,
  findUserIdByEmail,
};
