const express = require('express');
const connectDB = require('./config/db');
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const authRoutes = require('./userPanel/routes/auth');
const adminauthRoutes = require("./adminPanel/routes/auth");
const courseRoutes = require("./adminPanel/routes/courseRoutes");
const subcourseRoutes = require("./adminPanel/routes/subcourseRoutes");
const lessonRoutes = require("./adminPanel/routes/lessonRoutes");
const profileRoutes = require("./userPanel/routes/profile");
const userSideCourseRoutes = require("./userPanel/routes/course");
const favouriteCourseRoutes = require("./userPanel/routes/favouriteCourse");
const coursePurchaseRoutes = require("./userPanel/routes/userbuyCourse");
const markCompleted = require("./userPanel/routes/markCompleted");
const userCourseRoutes = require("./userPanel/routes/userCourses");
const ratingRoutes = require("./userPanel/routes/rating");
const searchRoutes = require("./userPanel/routes/searchCourse");
const templateRoutes = require("./adminPanel/routes/template");
const downloadCertificateRoutes = require("./userPanel/routes/downloadCertificate");
const dashboardRoutes = require("./adminPanel/routes/dashboard");
const adminProfileRoutes = require("./adminPanel/routes/profile");
const enrolledStudentsRoutes = require("./adminPanel/routes/enrolledStudents");
const totalusersRoutes = require("./adminPanel/routes/users");
const promoRoutes = require("./Promo/routes/promoRoutes");
const getAllRatings = require("./adminPanel/routes/ratings");
const InternshipLetter = require("./userPanel/routes/internshipLetter");
const uploadInternshipLetter = require("./adminPanel/routes/uploadInternshipLetter");
const NotificationService = require('./Notification/controller/notificationService');
const cron = require('node-cron');
const Lesson = require('./course/models/lesson');
const UserCourse = require('./userPanel/models/UserCourse/userCourse');
const notificationRoutes = require("./Notification/routes/notification");

require('dotenv').config();

// Set timezone to IST
process.env.TZ = 'Asia/Kolkata';

// Default system sender ID
const SYSTEM_SENDER_ID = new mongoose.Types.ObjectId();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Initialize Socket.IO with WebSocket support
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Make io available to routes
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('disconnect', () => {});
});

// Schedule task to send lesson reminders every minute
const startLessonReminder = async () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentTime = now.getTime();

      // Find lessons scheduled for today
      const lessons = await Lesson.find({
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      });

      for (const lesson of lessons) {
        const lessonDate = new Date(lesson.date);
        if (lessonDate.getDate() !== today.getDate()) continue;

        const startTime = lesson.startTime;
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) continue;

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
          // Find enrolled users
          const enrolledUsers = await UserCourse.find({ subcourseId: lesson.subcourseId }).select('userId');
          if (enrolledUsers.length === 0) continue;

          const notificationData = {
            recipientId: null, // Will be set for each user
            senderId: SYSTEM_SENDER_ID,
            title: `Lesson Update: ${lesson.lessonName}`,
            body: `The lesson ${lesson.lessonName} is ${reminderType === 'now' ? 'starting now' : 'starting in few 15 mintues'}!`,
            type: 'lesson_live',
            data: {
              lessonId: lesson._id,
              subcourseId: lesson.subcourseId,
            },
            createdAt: new Date(),
          };

          for (const { userId } of enrolledUsers) {
            notificationData.recipientId = userId;
            io.to(userId.toString()).emit('lesson_notification', notificationData);
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
            } catch (notificationError) {
              console.error(`Error sending Firebase notification to user ${userId}:`, notificationError.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in lesson reminder check:', error.message);
    }
  });
};

// Start reminder after MongoDB connection
mongoose.connection.once('open', () => {
  startLessonReminder();
});

// Routes
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// User Routes
app.use('/api/auth', authRoutes);
app.use("/api/user/profile", profileRoutes);
app.use("/api/user/course", userSideCourseRoutes, userCourseRoutes);
app.use('/api/user/favorite', favouriteCourseRoutes);
app.use('/api/user/buy', coursePurchaseRoutes);
app.use("/api/user/mark", markCompleted);
app.use("/api/user/rating", ratingRoutes);
app.use("/api/user/search", searchRoutes);
app.use("/api/user/certificate", downloadCertificateRoutes);
app.use("/api/user/internshipLetter", InternshipLetter);
app.use("/api/notification", notificationRoutes);

// Admin Routes
app.use("/api/admin/auth", adminauthRoutes);
app.use("/api/admin/course", courseRoutes);
app.use("/api/admin/subcourse", subcourseRoutes);
app.use("/api/admin/lesson", lessonRoutes);
app.use("/api/admin/template", templateRoutes);
app.use("/api/admin/stats", dashboardRoutes);
app.use("/api/admin/students", enrolledStudentsRoutes);
app.use("/api/admin/profile", adminProfileRoutes);
app.use("/api/admin/users", totalusersRoutes);
app.use("/api/admin/ratings", getAllRatings);
app.use("/api/admin/upload", uploadInternshipLetter);
app.use("/api/promo", promoRoutes);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});