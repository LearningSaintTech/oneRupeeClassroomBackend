const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'course_unlocked', // Sent when a subcourse is purchased
      'lesson_live', // Sent when a lesson is scheduled to go live
      'subcourse_completed', // Sent when a subcourse is completed
      'course_completed', // Sent when a course is completed
      'certificate_downloaded', // Sent when a certificate is downloaded
      'internship_letter_payment', // Sent to admins when internship payment is verified
      'internship_letter_payment_completed', // Sent to admins when internship payment is completed
      'internship_letter_uploaded',
      'admin_global_notification' 
    ],
    required: true,
  },
  data: {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
    subcourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcourse',
    },
    internshipLetterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InternshipLetter',
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    customData: mongoose.Schema.Types.Mixed,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  isPushSent: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);