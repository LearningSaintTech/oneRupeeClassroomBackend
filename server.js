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
const templateRoutes = require("./adminPanel/routes/template");
const downloadCertificateRoutes = require("./userPanel/routes/downloadCertificate");
const dashboardRoutes = require("./adminPanel/routes/dashboard");
const adminProfileRoutes = require("./adminPanel/routes/profile");
const enrolledStudentsRoutes = require("./adminPanel/routes/enrolledStudents");
const totalusersRoutes = require("./adminPanel/routes/users");
const promoRoutes = require("./Promo/routes/promoRoutes");
const getAllRatings = require("./adminPanel/routes/ratings");


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
app.use("/api/user/search",searchRoutes);
app.use("/api/user/certificate",downloadCertificateRoutes);




app.use("/api/admin/auth",adminauthRoutes);
app.use("/api/admin/course",courseRoutes);
app.use("/api/admin/subcourse",subcourseRoutes);
app.use("/api/admin/lesson",lessonRoutes);
app.use("/api/admin/template",templateRoutes);
app.use("/api/admin/stats",dashboardRoutes);
app.use("/api/admin/students",enrolledStudentsRoutes);
app.use("/api/admin/profile",adminProfileRoutes);
app.use("/api/admin/users",totalusersRoutes);
app.use("/api/admin/ratings",getAllRatings);


app.use("/api/promo",promoRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});