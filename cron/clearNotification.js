const cron = require('node-cron');
const mongoose = require('mongoose');


const Notification = require("../Notification/model/notification");

// Class to handle notification cleanup
class NotificationCleanup {
  // Delete notifications older than 2 days
  static async clearOldNotifications() {
    console.log('🔔 [clearOldNotifications] Starting cleanup:', {
      timestamp: new Date().toISOString(),
    });

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      console.log('🔔 [clearOldNotifications] Deleting notifications older than:', {
        cutoffDate: twoDaysAgo.toISOString(),
      });

      const result = await Notification.deleteMany({
        createdAt: { $lt: twoDaysAgo },
      });

      console.log('🔔 [clearOldNotifications] Cleanup completed:', {
        deletedCount: result.deletedCount,
        acknowledged: result.acknowledged,
      });

      return {
        success: true,
        message: `Deleted ${result.deletedCount} notifications older than 2 days`,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error('🔔 [clearOldNotifications] Error:', error);
      return {
        success: false,
        message: `Failed to clear old notifications: ${error.message}`,
      };
    }
  }

  // Schedule the cleanup task to run daily
  static scheduleCleanup() {
    console.log('🔔 [scheduleCleanup] Setting up daily cleanup schedule');

    // Schedule to run every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
      console.log('🔔 [scheduleCleanup] Running scheduled cleanup:', {
        timestamp: new Date().toISOString(),
      });

      const result = await this.clearOldNotifications();

      console.log('🔔 [scheduleCleanup] Scheduled cleanup result:', {
        success: result.success,
        message: result.message,
        deletedCount: result.deletedCount || 0,
      });
    }, {
      timezone: 'Asia/Kolkata', // Adjust timezone as needed (set to IST as per your context)
    });

    console.log('🔔 [scheduleCleanup] Cleanup schedule initialized');
  }
}

// Initialize the cleanup schedule when the module is loaded
NotificationCleanup.scheduleCleanup();

module.exports = NotificationCleanup;