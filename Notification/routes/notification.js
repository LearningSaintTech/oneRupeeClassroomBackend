const express = require('express');
const router = express.Router();
const {
  saveFCMToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  removeFCMToken,
} = require('../controller/notificationController');
const {verifyToken} = require('../../middlewares/authMiddleware');

// Routes
router.post('/save-fcm-token', verifyToken, saveFCMToken);
router.get('/get-notifications', verifyToken, getNotifications);
router.patch('/read/:notificationId', verifyToken, markAsRead);
router.patch('/read-all', verifyToken, markAllAsRead);
router.get('/unread-count', verifyToken, getUnreadCount);
router.delete('/remove-fcm-token', verifyToken, removeFCMToken);

module.exports = router;