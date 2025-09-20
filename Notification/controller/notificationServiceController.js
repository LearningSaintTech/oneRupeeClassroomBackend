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
      const fcmTokenDoc = await FCMToken.findOne({
        userId: recipientId,
        'tokens.isActive': true, // Ensure at least one token is active
      });

      if (!fcmTokenDoc || !fcmTokenDoc.tokens.length) {
        console.log('🔔 [sendPushNotification] No active FCM token found for user:', {
          recipientId,
        });
        console.log('🔔 [sendPushNotification] Checking all FCM tokens in database...');
        const allTokens = await FCMToken.find({}).select('userId tokens.isActive');
        console.log('🔔 [sendPushNotification] All FCM tokens in database:', allTokens);
        return;
      }

      // Get the first active token (you can modify this logic to handle multiple tokens)
      const activeToken = fcmTokenDoc.tokens.find(token => token.isActive);
      if (!activeToken) {
        console.log('🔔 [sendPushNotification] No active token in tokens array:', {
          recipientId,
        });
        return;
      }

      console.log('🔔 [sendPushNotification] FCM token found:', {
        userId: fcmTokenDoc.userId,
        fcmToken: `${activeToken.fcmToken.substring(0, 20)}...`,
        isActive: activeToken.isActive,
        lastSeen: activeToken.lastSeen,
      });

      // Send FCM message
      const message = {
        token: activeToken.fcmToken,
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
        token: `${activeToken.fcmToken.substring(0, 20)}...`,
        title,
        body,
        data: message.data,
      });

      const response = await sendNotificationToToken(activeToken.fcmToken, message);
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

  static async deleteNotification(notificationId, userId) {
    console.log('🔔 [deleteNotification] Starting:', {
      notificationId,
      userId,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await Notification.findOneAndDelete({
        _id: notificationId,
        recipientId: userId,
      });

      console.log('🔔 [deleteNotification] Result:', {
        notificationFound: !!result,
        notificationId: result?._id,
        title: result?.title,
      });

      return result;
    } catch (error) {
      console.error('🔔 [deleteNotification] Error:', error);
      throw error;
    }
  }

  //global notification

   // Global notification with batching
  static async sendGlobalNotification(notificationData, batchSize = 100) {
    console.log('🔔 [sendGlobalNotification] Starting:', {
      title: notificationData.title,
      type: notificationData.type,
      timestamp: new Date().toISOString(),
      batchSize,
    });

    try {
      // Get all active users
      const users = await User.find({ isNumberVerified: true }).select('_id');
      console.log('🔔 [sendGlobalNotification] Found users:', {
        count: users.length,
        userIds: users.map(u => u._id)
      });

      if (!users.length) {
        console.log('🔔 [sendGlobalNotification] No active users found');
        return { success: false, message: 'No active users found' };
      }

      // Create notifications for all users
      const notifications = users.map((user) => ({
        ...notificationData,
        recipientId: user._id,
        type: 'admin_global_notification',
      }));

      console.log('🔔 [sendGlobalNotification] Created notifications:', {
        count: notifications.length,
      });

      // Process notifications in batches
      const savedNotifications = [];
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        console.log('🔔 [sendGlobalNotification] Processing batch:', {
          batchNumber: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          startIndex: i,
          endIndex: i + batch.length - 1,
        });

        // Process batch concurrently
        const batchPromises = batch.map(async (notification) => {
          console.log('🔔 [sendGlobalNotification] Processing notification for user:', notification.recipientId);
          try {
            const savedNotification = await this.createAndSendNotification(notification);
            return savedNotification;
          } catch (error) {
            console.error('🔔 [sendGlobalNotification] Error processing notification for user:', {
              recipientId: notification.recipientId,
              error: error.message,
            });
            return null; // Return null for failed notifications to avoid breaking the batch
          }
        });

        const batchResults = await Promise.all(batchPromises);
        savedNotifications.push(...batchResults.filter(n => n)); // Filter out null results

        console.log('🔔 [sendGlobalNotification] Batch processed:', {
          batchNumber: Math.floor(i / batchSize) + 1,
          notificationsProcessed: batchResults.length,
          successfulNotifications: batchResults.filter(n => n).length,
        });
      }

      console.log('🔔 [sendGlobalNotification] Global notifications sent:', {
        count: savedNotifications.length,
      });

      return { 
        success: true, 
        message: `Global notification sent to ${savedNotifications.length} users`,
        notifications: savedNotifications
      };
    } catch (error) {
      console.error('🔔 [sendGlobalNotification] Error:', error);
      return { success: false, message: `Failed to send global notification: ${error.message}` };
    }
  }
}

module.exports = NotificationService;