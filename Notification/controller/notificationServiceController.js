const Notification = require('../model/notification');
const FCMToken = require('../model/fcmToken');
const User = require('../../userPanel/models/Auth/Auth'); 
const Admin = require("../../adminPanel/models/Auth/auth");
const { sendNotificationToToken } = require('../../config/firebase');

class NotificationService {
  // Create notification and send push
  static async createAndSendNotification(notificationData) {
    console.log('🔔 [createAndSendNotification] Starting:', {
      recipientId: notificationData.recipientId,
      type: notificationData.type,
      title: notificationData.title,
      timestamp: new Date().toISOString(),
    });

    try {
      // Save to database
      console.log('🔔 [createAndSendNotification] Saving to database...');
      const notification = new Notification(notificationData);
      await notification.save();
      console.log('🔔 [createAndSendNotification] Saved to database:', {
        notificationId: notification._id,
        createdAt: notification.createdAt,
      });

      // Send push notification
      console.log('🔔 [createAndSendNotification] Sending push notification...');
      await this.sendPushNotification(notificationData);

      console.log('🔔 [createAndSendNotification] Completed successfully');
      return notification;
    } catch (error) {
      console.error('🔔 [createAndSendNotification] Error:', error);
      throw error;
    }
  }

  // Send push notification via FCM
  static async sendPushNotification(notificationData) {
    console.log('🔔 [sendPushNotification] Starting:', {
      recipientId: notificationData.recipientId,
      title: notificationData.title,
      type: notificationData.type,
      timestamp: new Date().toISOString(),
    });

    try {
      const { recipientId, title, body, type, data } = notificationData;

      // Get FCM token
      console.log('🔔 [sendPushNotification] Looking for FCM token for user:', recipientId);
      const fcmToken = await FCMToken.findOne({
        userId: recipientId,
        isActive: true,
      });

      if (!fcmToken) {
        console.log('🔔 [sendPushNotification] No FCM token found for user:', {
          recipientId,
        });
        console.log('🔔 [sendPushNotification] Checking all FCM tokens in database...');
        const allTokens = await FCMToken.find({}).select('userId isActive');
        console.log('🔔 [sendPushNotification] All FCM tokens in database:', allTokens);
        return;
      }

      console.log('🔔 [sendPushNotification] FCM token found:', {
        userId: fcmToken.userId,
        isActive: fcmToken.isActive,
        lastSeen: fcmToken.lastSeen,
      });

      // Send FCM message
      const message = {
        token: fcmToken.fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          type,
          courseId: data?.courseId?.toString() || '',
          subcourseId: data?.subcourseId?.toString() || '',
          internshipLetterId: data?.internshipLetterId?.toString() || '',
          notificationId: notificationData._id?.toString() || '',
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'course_notifications',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      console.log('🔔 [sendPushNotification] Sending FCM message:', {
        token: fcmToken.fcmToken ? `${fcmToken.fcmToken.substring(0, 20)}...` : null,
        title,
        body,
        data: message.data,
      });

      const response = await sendNotificationToToken(fcmToken.fcmToken, message);
      console.log('🔔 [sendPushNotification] FCM response:', response);

      // Update notification as sent
      console.log('🔔 [sendPushNotification] Updating notification as sent...');
      await Notification.findByIdAndUpdate(notificationData._id, { isPushSent: true });
      console.log('🔔 [sendPushNotification] Notification marked as sent');
    } catch (error) {
      console.error('🔔 [sendPushNotification] Error:', error);
    }
  }

  // Get user notifications
  static async getUserNotifications(userId, page = 1, limit = 20) {
    console.log('🔔 [getUserNotifications] Starting:', {
      userId,
      page,
      limit,
      timestamp: new Date().toISOString(),
    });

    const skip = (page - 1) * limit;

    console.log('🔔 [getUserNotifications] Querying notifications...');
    const notifications = await Notification.find({
      recipientId: userId,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log('🔔 [getUserNotifications] Notifications found:', {
      count: notifications.length,
      notifications: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        title: n.title,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
    });

    console.log('🔔 [getUserNotifications] Counting total...');
    const total = await Notification.countDocuments({
      recipientId: userId,
    });

    console.log('🔔 [getUserNotifications] Total count:', total);

    return { notifications, total, page, limit };
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    console.log('🔔 [markAsRead] Starting:', {
      notificationId,
      userId,
      timestamp: new Date().toISOString(),
    });

    const result = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    console.log('🔔 [markAsRead] Result:', {
      notificationFound: !!result,
      notificationId: result?._id,
      isRead: result?.isRead,
      title: result?.title,
    });

    return result;
  }

  // Mark all notifications as read
  static async markAllAsRead(userId) {
    console.log('🔔 [markAllAsRead] Starting:', {
      userId,
      timestamp: new Date().toISOString(),
    });

    const result = await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true }
    );

    console.log('🔔 [markAllAsRead] Result:', {
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
    });

    return result;
  }

  // Get unread count
  static async getUnreadCount(userId) {
    console.log('🔔 [getUnreadCount] Starting:', {
      userId,
      timestamp: new Date().toISOString(),
    });

    const count = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    console.log('🔔 [getUnreadCount] Result:', {
      unreadCount: count,
    });

    return count;
  }

  // Send notification to admin
 static async sendAdminNotification(notificationData) {
  console.log('🔔 [sendAdminNotification] Starting:', {
    title: notificationData.title,
    type: notificationData.type,
    timestamp: new Date().toISOString(),
  });

  try {
    // Find admin users from the admin collection
    const admins = await Admin.find({ role: 'admin' }).select('_id');
    console.log('🔔 [sendAdminNotification] Found admins:', {
      count: admins.length,
      adminIds: admins.map(a => a._id)
    });
    
    if (!admins.length) {
      console.log('🔔 [sendAdminNotification] No admins found');
      return;
    }

    // Create notifications for all admins
    const notifications = admins.map((admin) => ({
      ...notificationData,
      recipientId: admin._id,
    }));

    console.log('🔔 [sendAdminNotification] Created notifications for admins:', {
      count: notifications.length,
      notifications: notifications.map(n => ({
        recipientId: n.recipientId,
        title: n.title,
        type: n.type
      }))
    });

    // Save and send notifications
    for (const notification of notifications) {
      console.log('🔔 [sendAdminNotification] Processing notification for admin:', notification.recipientId);
      await this.createAndSendNotification(notification);
    }

    console.log('🔔 [sendAdminNotification] Admin notifications sent:', {
      count: notifications.length,
    });
  } catch (error) {
    console.error('🔔 [sendAdminNotification] Error:', error);
  }
}
}

module.exports = NotificationService;