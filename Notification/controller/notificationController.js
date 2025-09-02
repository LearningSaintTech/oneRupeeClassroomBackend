const NotificationService = require('./notificationServiceController');
const FCMToken = require('../model/fcmToken'); // Adjust path as needed
const { apiResponse } = require('../../utils/apiResponse'); // Adjust path as needed

// Save FCM token
exports.saveFCMToken = async (req, res) => {
  console.log('🔔 [saveFCMToken] Request received:', {
    body: req.body,
    userId: req.userId,
    timestamp: new Date().toISOString(),
  });

  try {
    const { fcmToken, deviceId } = req.body;
    const userId = req.userId; // From authMiddleware

    if (!fcmToken || !deviceId) {
      console.log('🔔 [saveFCMToken] Missing fcmToken or deviceId');
      return apiResponse(res, {
        success: false,
        message: 'FCM token and device ID are required',
        statusCode: 400,
      });
    }

    // Find or create user document with tokens array
    const result = await FCMToken.findOneAndUpdate(
      { userId },
      { 
        $addToSet: { 
          tokens: { 
            fcmToken, 
            deviceId, 
            isActive: true, 
            lastSeen: new Date() 
          }
        }
      },
      { 
        upsert: true, 
        new: true 
      }
    );

    console.log('🔔 [saveFCMToken] FCM token saved successfully:', {
      userId,
      tokenCount: result.tokens.length,
      lastAddedToken: fcmToken,
    });

    return apiResponse(res, {
      success: true,
      message: 'FCM token saved successfully',
      statusCode: 200,
      data: { tokenCount: result.tokens.length }
    });
  } catch (error) {
    console.error('🔔 [saveFCMToken] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to save FCM token: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Get user notifications
exports.getNotifications = async (req, res) => {
  console.log('🔔 [getNotifications] Request received:', {
    query: req.query,
    userId: req.userId,
    timestamp: new Date().toISOString(),
  });

  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.userId;

    const result = await NotificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    console.log('🔔 [getNotifications] Result:', {
      notificationsCount: result.notifications?.length || 0,
      total: result.total,
      page: result.page,
      limit: result.limit,
    });

    return apiResponse(res, {
      success: true,
      message: 'Notifications retrieved successfully',
      data: result,
      statusCode: 200,
    });
  } catch (error) {
    console.error('�bell; [getNotifications] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to retrieve notifications: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  console.log('🔔 [markAsRead] Request received:', {
    params: req.params,
    userId: req.userId,
    timestamp: new Date().toISOString(),
  });

  try {
    const { notificationId } = req.params;
    const userId = req.userId;

    const notification = await NotificationService.markAsRead(notificationId, userId);

    if (!notification) {
      console.log('🔔 [markAsRead] Notification not found');
      return apiResponse(res, {
        success: false,
        message: 'Notification not found or unauthorized',
        statusCode: 404,
      });
    }

    console.log('🔔 [markAsRead] Result:', {
      notificationId: notification._id,
      isRead: notification.isRead,
    });

    return apiResponse(res, {
      success: true,
      message: 'Notification marked as read',
      data: notification,
      statusCode: 200,
    });
  } catch (error) {
    console.error('🔔 [markAsRead] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to mark notification as read: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  console.log('🔔 [markAllAsRead] Request received:', {
    userId: req.userId,
    timestamp: new Date().toISOString(),
  });

  try {
    const userId = req.userId;

    const result = await NotificationService.markAllAsRead(userId);

    console.log('🔔 [markAllAsRead] Result:', {
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged,
    });

    return apiResponse(res, {
      success: true,
      message: 'All notifications marked as read',
      data: { modifiedCount: result.modifiedCount },
      statusCode: 200,
    });
  } catch (error) {
    console.error('🔔 [markAllAsRead] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to mark all notifications as read: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Get unread notification count
exports.getUnreadCount = async (req, res) => {
  console.log('🔔 [getUnreadCount] Request received:', {
    userId: req.userId,
    timestamp: new Date().toISOString(),
  });

  try {
    const userId = req.userId;

    const count = await NotificationService.getUnreadCount(userId);

    console.log('🔔 [getUnreadCount] Result:', {
      unreadCount: count,
    });

    return apiResponse(res, {
      success: true,
      message: 'Unread notification count retrieved',
      data: { count },
      statusCode: 200,
    });
  } catch (error) {
    console.error('🔔 [getUnreadCount] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to retrieve unread count: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Remove or deactivate FCM token (logout)
exports.removeFCMToken = async (req, res) => {
  console.log('🔔 [removeFCMToken] Request received:', {
    body: req.body,
    userId: req.userId,
    timestamp: new Date().toISOString(),
  });

  try {
    const { fcmToken, deviceId } = req.body;
    const userId = req.userId;

    if (!fcmToken && !deviceId) {
      console.log('🔔 [removeFCMToken] Missing fcmToken or deviceId');
      return apiResponse(res, {
        success: false,
        message: 'FCM token or device ID required',
        statusCode: 400,
      });
    }

    const query = { userId };
    if (fcmToken) query.fcmToken = fcmToken;
    if (deviceId) query.deviceId = deviceId;

    const result = await FCMToken.findOneAndUpdate(
      query,
      { isActive: false },
      { new: true }
    );

    if (!result) {
      console.log('🔔 [removeFCMToken] FCM token not found');
      return apiResponse(res, {
        success: false,
        message: 'FCM token not found',
        statusCode: 404,
      });
    }

    console.log('🔔 [removeFCMToken] FCM token deactivated:', {
      userId,
      deviceId,
      fcmToken,
    });

    return apiResponse(res, {
      success: true,
      message: 'FCM token deactivated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('🔔 [removeFCMToken] Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to deactivate FCM token: ${error.message}`,
      statusCode: 500,
    });
  }
};