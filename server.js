const express = require('express');
const connectDB = require('./config/db');
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require('mongoose');

const authRoutes = require('./userPanel/routes/authRoutes');
const adminauthRoutes = require("./adminPanel/routes/authRoutes");
const courseRoutes = require("./adminPanel/routes/courseRoutes");
const subcourseRoutes = require("./adminPanel/routes/subcourseRoutes");
const lessonRoutes = require("./adminPanel/routes/lessonRoutes");
const profileRoutes = require("./userPanel/routes/profileRoutes");
const userSideCourseRoutes = require("./userPanel/routes/courseRoutes");
const favouriteCourseRoutes = require("./userPanel/routes/favouriteCourseRoutes");
const coursePurchaseRoutes = require("./userPanel/routes/userbuyCourseRoutes");
const markCompleted = require("./userPanel/routes/markCompletedRoutes");
const userCourseRoutes = require("./userPanel/routes/userCoursesRoutes");
const ratingRoutes = require("./userPanel/routes/ratingRoutes");
const searchRoutes = require("./userPanel/routes/searchCourseRoutes");
const templateRoutes = require("./adminPanel/routes/templateRoutes");
const downloadCertificateRoutes = require("./userPanel/routes/downloadCertificateRoutes");
const dashboardRoutes = require("./adminPanel/routes/dashboardRoutes");
const adminProfileRoutes = require("./adminPanel/routes/profileRoutes");
const enrolledStudentsRoutes = require("./adminPanel/routes/enrolledStudentsRoutes");
const totalusersRoutes = require("./adminPanel/routes/usersRoutes");
const promoRoutes = require("./Promo/routes/promoRoutes");
const getAllRatings = require("./adminPanel/routes/ratingsRoutes");
const InternshipLetter = require("./userPanel/routes/internshipLetterRoutes");
const uploadInternshipLetter = require("./adminPanel/routes/uploadInternshipLetterRoutes");
const NotificationService = require('./Notification/controller/notificationServiceController');
const notificationRoutes = require("./Notification/routes/notificationRoutes");
const verifyemailRoutes = require("./userPanel/routes/verifyEmailRoutes");
const startLessonReminder = require('./cron/lessonReminders');
const eventNames = require('./socket/eventNames');
const NotificationCleanup = require('./cron/clearNotification');
const twofactorRoutes = require('./twofactor/routes/twofactorRoutes'); 
const recordedLessonRoutes = require("./userPanel/routes/recordedLessonRoutes");


require('dotenv').config();

// Set timezone to IST
process.env.TZ = 'Asia/Kolkata';

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔗 [Socket Connected] Socket ID: ${socket.id}, Timestamp: ${new Date().toISOString()}`);
  
  socket.on(eventNames.JOIN, (userId) => {
    console.log(`📌 [Join Event] User ID: ${userId} joined room with Socket ID: ${socket.id}, Timestamp: ${new Date().toISOString()}`);
    socket.join(userId.toString());
    console.log(`✅ [Room Joined] Current rooms for socket ${socket.id}:`, socket.rooms, `Timestamp: ${new Date().toISOString()}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ [Socket Disconnected] Socket ID: ${socket.id}, Reason: ${reason}, Timestamp: ${new Date().toISOString()}`);
  });
});

// Make io available to routes
app.set('io', io);

// Start reminder after MongoDB connection
mongoose.connection.once('open', () => {
  console.log(`✅ [MongoDB Connected] Starting lesson reminder cron job`);
  startLessonReminder(io);
});

// Routes
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      firebase: 'Available',
      twilio: 'Available',
      twofactor: 'Available'
    }
  });
});

// User Routes
app.use('/api/auth', authRoutes, verifyemailRoutes);
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
app.use("/api/user/recordedLessons",recordedLessonRoutes)

// NEW: 2Factor Routes
app.use('/api/2factor', twofactorRoutes);

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
  console.log(`🚀 [Server Started] Running on port ${PORT}`);
});