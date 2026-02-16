# OneRupee Classroom Backend - Module Overview

## 📋 Project Structure

This is a Node.js/Express backend application for an e-learning platform with separate admin and user panels, payment processing, real-time notifications, and AI chatbot integration.

---

## 🏗️ Core Architecture

### **Entry Point**
- `server.js` - Main server file with Express setup, Socket.IO initialization, and route mounting

### **Technology Stack**
- **Framework**: Express.js 5.1.0
- **Database**: MongoDB (Mongoose 8.17.1)
- **Real-time**: Socket.IO 4.8.1
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Payment**: Razorpay 2.9.6
- **File Storage**: AWS S3
- **Push Notifications**: Firebase Admin SDK
- **Scheduling**: node-cron 4.2.1

---

## 📁 Module Structure

### **1. Configuration (`/config`)**
Core configuration files for external services:
- `db.js` - MongoDB connection
- `firebase.js` - Firebase Admin configuration
- `razorpay.js` - Razorpay payment gateway config
- `s3.js` - AWS S3 storage configuration

### **2. Middlewares (`/middlewares`)**
- `authMiddleware.js` - JWT token verification middleware (`verifyToken`)

### **3. Utilities (`/utils`)**
Shared utility functions:
- `apiResponse.js` - Standardized API response formatter
- `exportToCsv.js` - CSV export functionality
- `s3Functions.js` - AWS S3 file operations

### **4. Socket.IO (`/socket`)**
Real-time communication:
- `eventNames.js` - Socket event name constants
- `emitters.js` - Socket event emitters
- `socketService.js` - Socket service layer

**Socket Events:**
- `LIVE_LESSON` - Live lesson notifications
- `REQUEST_INTERNSHIP_LETTER` - Internship letter requests
- `UPLOAD_INTERNSHIP_LETTER` - Internship letter uploads
- `BUY_COURSE` - Course purchase events
- `JOIN` - User room joining
- `GLOBAL_NOTIFICATION` - Global notifications

### **5. Cron Jobs (`/cron`)**
Scheduled tasks:
- `lessonReminders.js` - Automated lesson reminder notifications
- `clearNotification.js` - Notification cleanup job

---

## 👥 User Panel (`/userPanel`)

### **Controllers**
- **Auth** (`/controllers/auth`)
  - `authController.js` - User registration, login, OTP verification

- **Profile** (`/controllers/profile`)
  - `profileController.js` - User profile management

- **Course** (`/controllers/course`)
  - `courseController.js` - Course browsing, details

- **UserBuyCourse** (`/controllers/UserbuyCourse`)
  - `userCourseController.js` - Course purchase, payment processing (Razorpay & Apple)

- **UserCourses** (`/controllers/userCourses`)
  - `userCourseController.js` - User's enrolled courses management

- **FavouriteCourse** (`/controllers/FavouriteCourse`)
  - `favouriteCourseController.js` - Favorite courses management

- **MarkCompleted** (`/controllers/markCompleted`)
  - `markCompletedController.js` - Course/lesson completion tracking

- **Rating** (`/controllers/userRating`)
  - `ratingController.js` - Course rating and reviews

- **Search** (`/controllers/search`)
  - `searchController.js` - Course search functionality

- **Certificate** (`/controllers/certificate`)
  - `downloadCertificateController.js` - Certificate generation and download

- **InternshipLetter** (`/controllers/InternshipLetter`)
  - `internshipLetterController.js` - Internship letter requests

- **RecordedLessons** (`/controllers/recordedLessons`)
  - `recordedLessons.js` - Recorded lesson access

- **VerifyEmail** (`/controllers/verifyEmail`)
  - `verifyEmailController.js` - Email verification

- **Activity** (`/controllers/activityController`)
  - `activityController.js` - User activity tracking

### **Models**
- **Auth** (`/models/Auth`)
  - `Auth.js` - User schema (fullName, mobileNumber, role, purchasedsubCourses)

- **Profile** (`/models/Profile`)
  - `userProfile.js` - User profile details

- **UserCourse** (`/models/UserCourse`)
  - `userCourse.js` - User course enrollment with payment details
  - `userLesson.js` - User lesson progress
  - `usermainCourse.js` - Main course enrollment

- **Favourite** (`/models/Favourite`)
  - `favouriteCourse.js` - Favorite courses

- **Rating** (`/models/Rating`)
  - `rating.js` - Course ratings and reviews

- **Certificates** (`/models/certificates`)
  - `certificate.js` - Certificate data

- **OTP** (`/models/OTP`)
  - `otp.js` - OTP verification codes

- **RecordedLesson** (`/models/recordedLesson`)
  - `recordedLesson.js` - Recorded lesson metadata

### **Routes**
All routes prefixed with `/api/user/*` or `/api/auth/*`:
- `authRoutes.js` - Authentication endpoints
- `profileRoutes.js` - Profile endpoints
- `courseRoutes.js` - Course browsing
- `userbuyCourseRoutes.js` - Course purchase
- `userCoursesRoutes.js` - Enrolled courses
- `favouriteCourseRoutes.js` - Favorites
- `markCompletedRoutes.js` - Completion tracking
- `ratingRoutes.js` - Ratings
- `searchCourseRoutes.js` - Search
- `downloadCertificateRoutes.js` - Certificates
- `internshipLetterRoutes.js` - Internship letters
- `recordedLessonRoutes.js` - Recorded lessons
- `verifyEmailRoutes.js` - Email verification
- `activityRoutes.js` - Activities

---

## 🔧 Admin Panel (`/adminPanel`)

### **Controllers**
- **Auth** (`/controllers/auth`)
  - `authController.js` - Admin login, authentication

- **Course** (`/controllers/course`)
  - `courseController.js` - Course CRUD operations
  - `subcourseController.js` - Subcourse management
  - `lessonController.js` - Lesson management

- **Dashboard** (`/controllers/dashboard`)
  - `dashboardController.js` - Admin dashboard statistics

- **Users** (`/controllers/Users`)
  - `usersController.js` - User management, search, CSV export

- **Payment** (`/controllers/payment`)
  - `paymentController.js` - Payment history, completed payments with date filters

- **Profile** (`/controllers/profile`)
  - `profileController.js` - Admin profile management

- **Ratings** (`/controllers/getAllRatings`)
  - `ratingsController.js` - All course ratings management

- **TemplateUpload** (`/controllers/TemplateUpload`)
  - `certificateTemplateController.js` - Certificate template management

- **UploadInternshipLetter** (`/controllers/uploadInternshipLetter`)
  - `uploadInternshipLetterController.js` - Internship letter uploads

- **StudentsEnrolled** (`/controllers/studentsEnrolled`)
  - `totalUsers.js` - Enrolled students statistics

- **SendNotification** (`/controllers/sendNotification`)
  - `sendNotification.js` - Push notification sending

- **Activity** (`/controllers/activity`)
  - `activityController.js` - Activity tracking

### **Models**
- **Auth** (`/models/Auth`)
  - `auth.js` - Admin schema

- **Course** (`/models/course`)
  - `course.js` - Course schema (courseName, CoverImageUrl, pricing, Apple product IDs)
  - `subcourse.js` - Subcourse schema
  - `lesson.js` - Lesson schema

- **Profile** (`/models/profile`)
  - `profile.js` - Admin profile

- **Templates** (`/models/Templates`)
  - `certificateTemplate.js` - Certificate templates

- **InternshipLetter** (`/models/InternshipLetter`)
  - `internshipLetter.js` - Internship letter documents

- **Activities** (`/models/Activites`)
  - `activity.js` - Activity logs

### **Routes**
All routes prefixed with `/api/admin/*`:
- `authRoutes.js` - Admin authentication
- `courseRoutes.js` - Course management
- `subcourseRoutes.js` - Subcourse management
- `lessonRoutes.js` - Lesson management
- `dashboardRoutes.js` - Dashboard stats
- `usersRoutes.js` - User management
- `paymentRoutes.js` - Payment management
- `profileRoutes.js` - Admin profile
- `ratingsRoutes.js` - Ratings management
- `templateRoutes.js` - Certificate templates
- `uploadInternshipLetterRoutes.js` - Internship letters
- `enrolledStudentsRoutes.js` - Student enrollment
- `activityRoutes.js` - Activities

---

## 🎯 Shared Modules

### **Promo** (`/Promo`)
- **Controllers**: `promoController.js` - Promotional banner management
- **Models**: `promo.js` - Promo schema
- **Routes**: `promoRoutes.js` - `/api/promo/*`

### **Notification** (`/Notification`)
- **Controllers**: 
  - `notificationController.js` - Notification CRUD
  - `notificationServiceController.js` - FCM push notification service
- **Models**:
  - `notification.js` - Notification schema
  - `fcmToken.js` - FCM device tokens
- **Routes**: `notificationRoutes.js` - `/api/notification/*`

### **TwoFactor** (`/twofactor`)
- **Controllers**: `twofactorAuthController.js` - 2FA authentication
- **Services**: `twofactorService.js` - 2FA logic
- **Config**: `twofactorConfig.js` - 2FA configuration
- **Routes**: `twofactorRoutes.js` - `/api/2factor/*`

### **AI-Chatbot** (`/AI-Chatbot`)
- **Controllers**: `chatController.js` - AI chatbot integration
- **Routes**: `chatBotRoutes.js` - `/api/chatbot/*`

---

## 🔐 Security Features

1. **JWT Authentication** - Token-based auth for all protected routes
2. **Session Management** - Express sessions with secure cookies
3. **Two-Factor Authentication** - Additional security layer
4. **CORS** - Configured for frontend origin
5. **Token Verification Middleware** - Applied to protected routes

---

## 💳 Payment Integration

- **Razorpay** - Primary payment gateway for Indian payments
- **Apple In-App Purchase** - Support for Apple product IDs
- Payment tracking in `userCourse` model with:
  - Order IDs, Payment IDs, Signatures
  - Payment amounts, dates, currency
  - Transaction status

---

## 📊 Key Features

1. **Course Management** - Full CRUD for courses, subcourses, lessons
2. **User Enrollment** - Course purchase and enrollment tracking
3. **Progress Tracking** - Lesson completion and course progress
4. **Certificates** - Dynamic certificate generation
5. **Ratings & Reviews** - Course rating system
6. **Search** - Course search functionality
7. **Favorites** - User favorite courses
8. **Notifications** - Real-time push notifications via FCM
9. **Internship Letters** - Request and upload system
10. **Recorded Lessons** - Access to recorded content
11. **Activity Tracking** - User and admin activity logs
12. **Payment Analytics** - Payment history with date filters
13. **CSV Export** - User data export functionality
14. **AI Chatbot** - Integrated chatbot support

---

## 🚀 API Endpoints Summary

### User Endpoints (`/api/user/*`, `/api/auth/*`)
- Authentication, Profile, Courses, Purchases, Favorites, Ratings, Search, Certificates, Internship Letters, Recorded Lessons, Activities

### Admin Endpoints (`/api/admin/*`)
- Auth, Course Management, User Management, Payments, Dashboard, Ratings, Templates, Internship Letters, Activities

### Shared Endpoints
- `/api/notification/*` - Notifications
- `/api/promo/*` - Promotional content
- `/api/2factor/*` - Two-factor authentication
- `/api/chatbot/*` - AI chatbot

---

## 📝 Environment Variables Required

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `RAZORPAY_KEY_ID` - Razorpay key
- `RAZORPAY_KEY_SECRET` - Razorpay secret
- `AWS_ACCESS_KEY_ID` - S3 access key
- `AWS_SECRET_ACCESS_KEY` - S3 secret
- `FIREBASE_SERVICE_ACCOUNT` - Firebase credentials
- `SESSION_SECRET` - Session encryption secret
- `PORT` - Server port (default: 3000)

---

## 🔄 Data Flow

1. **User Registration/Login** → JWT token generation
2. **Course Purchase** → Payment processing → Enrollment creation
3. **Lesson Completion** → Progress update → Certificate eligibility
4. **Notifications** → FCM push → Socket.IO real-time update
5. **Admin Actions** → Activity logging → User notifications

---

## 📦 Dependencies Highlights

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **socket.io** - Real-time communication
- **jsonwebtoken** - JWT authentication
- **razorpay** - Payment gateway
- **firebase-admin** - Push notifications
- **@aws-sdk/client-s3** - AWS S3 integration
- **multer** - File upload handling
- **node-cron** - Scheduled tasks
- **puppeteer** - PDF generation (certificates)
- **canvas** - Image processing

---

*Last Updated: Based on current codebase structure*

