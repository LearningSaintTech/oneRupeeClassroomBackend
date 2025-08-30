const cron = require('node-cron');
const Lesson = require('../adminPanel/models/course/lesson');
const UserCourse = require('../userPanel/models/UserCourse/userCourse');
const NotificationService = require('../Notification/controller/notificationServiceController');
const { emitLiveLesson } = require('../socket/emitters');
const mongoose = require('mongoose');

const SYSTEM_SENDER_ID = new mongoose.Types.ObjectId();

const startLessonReminder = (io) => {
  console.log(`⏰ [Cron Started] Lesson reminder cron job initiated, Timestamp: ${new Date().toISOString()}`);
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentTime = now.getTime();
      console.log(`🔍 [Cron Run] Checking lessons for reminders, Current Time: ${now.toISOString()}`);

      // Find lessons scheduled for today
      const lessons = await Lesson.find({
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      });
      console.log(`📚 [Lessons Found] ${lessons.length} lessons scheduled for today`);

      for (const lesson of lessons) {
        const lessonDate = new Date(lesson.date);
        if (lessonDate.getDate() !== today.getDate()) {
          console.log(`⏭️ [Skipped Lesson] Lesson ${lesson.lessonName} not for today`);
          continue;
        }

        const startTime = lesson.startTime;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
          console.log(`⚠️ [Invalid Time] Lesson ${lesson.lessonName} has invalid startTime: ${startTime}`);
          continue;
        }

        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const lessonStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHours, startMinutes).getTime();
        const fifteenMinBefore = lessonStartTime - 15 * 60 * 1000;

        const oneMinWindow = 60 * 1000; // 1-minute window for cron

        let reminderType = null;
        if (currentTime >= lessonStartTime && currentTime < lessonStartTime + oneMinWindow) {
          reminderType = 'now';
        } else if (currentTime >= fifteenMinBefore && currentTime < fifteenMinBefore + oneMinWindow) {
          reminderType = '15 minutes before';
        }

        if (reminderType) {
          console.log(`🔔 [Reminder Triggered] Lesson: ${lesson.lessonName}, Type: ${reminderType}, Lesson ID: ${lesson._id}`);
          
          // Find enrolled users
          const enrolledUsers = await UserCourse.find({ subcourseId: lesson.subcourseId }).select('userId');
          console.log(`👥 [Enrolled Users] Found ${enrolledUsers.length} users for lesson ${lesson.lessonName}`);
          
          if (enrolledUsers.length === 0) {
            console.log(`⚠️ [No Users] No enrolled users for lesson ${lesson.lessonName}`);
            continue;
          }

          const notificationData = {
            recipientId: null,
            senderId: SYSTEM_SENDER_ID,
            title: `Lesson Update: ${lesson.lessonName}`,
            body: `The lesson ${lesson.lessonName} is ${reminderType === 'now' ? 'starting now' : 'starting in 15 minutes'}!`,
            type: 'lesson_live',
            data: {
              lessonId: lesson._id,
              subcourseId: lesson.subcourseId,
            },
            createdAt: new Date(),
          };

          for (const { userId } of enrolledUsers) {
            notificationData.recipientId = userId;
            console.log(`📨 [Sending Notification] To User ID: ${userId}, Lesson: ${lesson.lessonName}`);
            if (io) {
              emitLiveLesson(io, userId, notificationData);
              console.log(`✅ [Live Lesson Event Emitted] To User ID: ${userId}, Lesson: ${lesson.lessonName}`);
            } else {
              console.log(`⚠️ [Socket.IO Missing] Could not emit live_lesson event for User ID: ${userId}`);
            }
            try {
              await NotificationService.createAndSendNotification({
                recipientId: userId,
                senderId: SYSTEM_SENDER_ID,
                title: notificationData.title,
                body: notificationData.body,
                type: notificationData.type,
                data: {
                  lessonId: lesson._id,
                  subcourseId: lesson.subcourseId,
                },
              });
              console.log(`✅ [Notification Sent] To User ID: ${userId}, Lesson: ${lesson.lessonName}`);
            } catch (notificationError) {
              console.error(`❌ [Notification Error] Failed to send to User ID: ${userId}, Error: ${notificationError.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ [Cron Error] Lesson reminder check failed: ${error.message}, Timestamp: ${new Date().toISOString()}`);
    }
  });
};

module.exports = startLessonReminder;