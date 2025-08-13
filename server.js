const express = require('express');
const connectDB = require('./config/db');
const cors = require("cors");
const authRoutes = require('./userPanel/routes/auth');
const adminauthRoutes = require("./adminPanel/routes/auth");
const courseRoutes = require("./adminPanel/routes/courseRoutes");
const subcourseRoutes = require("./adminPanel/routes/subcourseRoutes");
const lessonRoutes = require("./adminPanel/routes/lessonRoutes");
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


app.use("/api/admin/auth",adminauthRoutes)
app.use("/api/admin/course",courseRoutes)
app.use("/api/admin/subcourse",subcourseRoutes)
app.use("/api/admin/lesson",lessonRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});