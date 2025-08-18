const express = require('express');
const connectDB = require('./config/db');
const cors = require("cors");
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


require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/user/profile",profileRoutes);
app.use("/api/user/course",userSideCourseRoutes,userCourseRoutes);
app.use('/api/user/favourite',favouriteCourseRoutes)
app.use('/api/user/buy',coursePurchaseRoutes);
app.use("/api/user/mark",markCompleted);
app.use("/api/user/rating",ratingRoutes);
app.use("/api/user/search",searchRoutes)



app.use("/api/admin/auth",adminauthRoutes)
app.use("/api/admin/course",courseRoutes)
app.use("/api/admin/subcourse",subcourseRoutes)
app.use("/api/admin/lesson",lessonRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});