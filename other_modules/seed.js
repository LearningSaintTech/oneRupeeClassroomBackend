const mongoose = require('mongoose');

// Require all models with updated paths
const Admin = require('./adminPanel/models/Auth/auth');
const AdminProfile = require('./adminPanel/models/profile/profile');
const Template = require('./adminPanel/models/Templates/certificateTemplate');
const Course = require('./adminPanel/models/course/course');
const Lesson = require('./adminPanel/models/course/lesson');
const Subcourse = require('./adminPanel/models/course/subcourse');
const InternshipLetter = require('./adminPanel/models/InternshipLetter/internshipLetter');
const Promo = require('./Promo/models/promo');
const User = require('./userPanel/models/Auth/Auth');
const Favourite = require('./userPanel/models/Favourite/favouriteCourse');
const UserProfile = require('./userPanel/models/Profile/userProfile');
const Rating = require('./userPanel/models/Rating/rating');
const UserCourse = require('./userPanel/models/UserCourse/userCourse');
const UserLesson = require('./userPanel/models/UserCourse/userLesson');
const UserMainCourse = require('./userPanel/models/UserCourse/usermainCourse');

// Image and video URLs provided
const imageUrl = 'https://yoraaecommerce.s3.amazonaws.com/promos/1756098426906_empty-classroom-desk-with-book-colored-pencils.jpg';
const videoUrl = 'https://yoraaecommerce.s3.amazonaws.com/lessons/videos/1755764617441_WhatsApp Video 2025-08-11 at 02.11.14 (1).mp4';

// Certificate HTML template
const certificateTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>A4 Container</title>
    <style>
        body {
            margin: 0;
            background-color: #f0f0f0;
            font-family: Arial, sans-serif;
        }

        .a4-container {
            width: 210mm;
            height: 297mm;
            background-color: white;
            margin: 0 auto;
            position: relative;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
            box-sizing: border-box;
            overflow: hidden;
        }

        .logo-image {
            position: absolute;
            top: -50px;
            left: 50%;
            transform: translateX(-50%);
            width: 400px;
            height: auto;
            max-width: 100%;
            max-height: 400px;
            z-index: 3;
        }

        .border-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            z-index: 1;
            pointer-events: none;
        }

        .certificate-content {
            position: absolute;
            top: 200px;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            z-index: 3;
            width: 80%;
            max-width: 600px;
        }

        .certificate-title {
            font-size: 2em;
            font-weight: bold;
            font-family: 'cambria', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(180deg, #F6B800 0%, #FF8800 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 10px rgba(255, 136, 0, 0.3);
        }

        .presented-to {
            font-size: 1.2em;
            color: #333;
            margin: 0 0 15px 0;
        }

        .recipient-name {
            font-size: 2.2em;
            font-weight: bold;
            color: #000;
            margin: 0 0 10px 0;
            text-transform: uppercase;
        }

        .underline {
            width: 300px;
            height: 2px;
            background-color: #333;
            margin: 0 auto 20px auto;
        }

        .completion-text {
            font-size: 1.1em;
            color: #333;
            margin: 0;
            line-height: 1.6;
            max-width: 400px;
            text-align: center;
            margin-left: auto;
            margin-right: auto;
        }

        .completion-text strong {
            font-weight: bold;
            color: #000;
        }

        .decorative-border {
            max-width: 300px;
            max-height: 60px;
            margin: 30px auto 0 auto;
            display: block;
        }

        .certification-text {
            font-family: 'Times New Roman', Times, serif;
            font-size: 1em;
            color: #333;
            margin: 30px auto 30px auto;
            line-height: 1.4;
            max-width: 500px;
            text-align: center;
            font-weight: normal;
        }

        .partner-logos {
            max-width: 500px;
            max-height: 500px;
            display: block;
            margin: 0 auto;
        }

        .bottom-section {
            position: absolute;
            bottom: 65px;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-between;
            padding: 0 40px;
            z-index: 3;
        }

        .completion-details {
            text-align: left;
            font-family: cambria, sans-serif;
            font-size: 0.9em;
            color: #333;
            padding: 20px;
        }

        .completion-details p {
            margin: 5px 0;
            line-height: 1.4;
        }

        .signature-section {
            text-align: center;
            font-family: cambria, sans-serif;
            font-size: 0.9em;
            color: #333;
        }

        .signature-image {
            max-width: 120px;
            max-height: 60px;
            margin-bottom: 10px;
            display: block;
        }
    </style>
</head>
<body>
    <div class="a4-container">
        <img src="https://yoraaecommerce.s3.amazonaws.com/learningSaintLogo" alt="Learning Saint Logo" class="logo-image">
        <img src="https://yoraaecommerce.s3.amazonaws.com/borderr" alt="Border Design" class="border-image">

        <div class="certificate-content">
            <h1 class="certificate-title">CERTIFICATE OF COMPLETION</h1>
            <p class="presented-to">Presented to</p>
            <h2 class="recipient-name">{{username}}</h2>
            <div class="underline"></div>
            <p class="completion-text">for successfully completing the <strong>{{subcourseName}}</strong><br><strong>Certification Program</strong> offered by <strong>Learning Saint</strong></p>
            <img src="https://yoraaecommerce.s3.amazonaws.com/yellow-line" alt="Decorative Border" class="decorative-border">
            <p class="certification-text">{{certificateDescription}}</p>
            <img src="https://yoraaecommerce.s3.amazonaws.com/yellow-line" alt="Decorative Border" class="decorative-border">
            <img src="https://yoraaecommerce.s3.amazonaws.com/company-logos" alt="Partner Logos" class="partner-logos">
        </div>

        <div class="bottom-section">
            <div class="completion-details">
                <p><strong>Completion Date:</strong><br>{{currentDate}}</p>
                <p><strong>Certificate ID:</strong><br>{{certificateId}}</p>
            </div>

            <div class="signature-section">
                <img src="https://yoraaecommerce.s3.amazonaws.com/signature" alt="Signature" class="signature-image">
                <p class="signature-name"><strong>Abhishek Sharma</strong></p>
                <p class="signature-title">Director</p>
                <p class="company-name">Learning Saint INC.</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

// Connect to MongoDB
// const DB_URI = 

async function seedDatabase() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB successfully');

    // Clear existing data
    console.log('Clearing existing data...');
    await Promise.all([
      Admin.deleteMany({}),
      AdminProfile.deleteMany({}),
      Template.deleteMany({}),
      Course.deleteMany({}),
      Lesson.deleteMany({}),
      Subcourse.deleteMany({}),
      InternshipLetter.deleteMany({}),
      Promo.deleteMany({}),
      User.deleteMany({}),
      Favourite.deleteMany({}),
      UserProfile.deleteMany({}),
      Rating.deleteMany({}),
      UserCourse.deleteMany({}),
      UserLesson.deleteMany({}),
      UserMainCourse.deleteMany({}),
    ]);
    console.log('Cleared existing data successfully');

    // 1. Create Admins (1 admin)
    console.log('Creating admins...');
    const admins = await Admin.insertMany([
      {
        mobileNumber: '+917042456533',
        isNumberVerified: true,
        role: 'admin',
      },
    ]);
    console.log(`Created ${admins.length} admins`);

    // Create Admin Profiles
    console.log('Creating admin profiles...');
    await AdminProfile.insertMany([
      {
        adminId: admins[0]._id,
        firstName: 'Admin',
        lastName: 'One',
        email: 'admin1@learningsaint.com',
        address: '123 Admin St',
        state: 'Delhi',
        city: 'New Delhi',
        pinCode: 110001,
        gender: 'Male',
        dob: new Date('1980-01-01'),
        profileImageUrl: imageUrl,
      },
    ]);
    console.log('Admin profiles created');

    // 2. Create Template (only the provided certificate template)
    console.log('Creating template...');
    await Template.create({
      content: certificateTemplate,
    });
    console.log('Certificate template created');

    // 3. Create Promos (5 promos)
    console.log('Creating promos...');
    await Promo.insertMany([
      { promo: imageUrl },
      { promo: imageUrl },
      { promo: imageUrl },
      { promo: imageUrl },
      { promo: imageUrl },
    ]);
    console.log('Promos created');

    // 4. Create Users (6 users with varied verification statuses)
    console.log('Creating users...');
    const users = await User.insertMany([
      {
        fullName: 'User One',
        mobileNumber: '+911234567890',
        isNumberVerified: true,
        role: 'user',
        isEmailVerified: true,
        purchasedsubCourses: [],
      },
      {
        fullName: 'User Two',
        mobileNumber: '+919876543210',
        isNumberVerified: true,
        role: 'user',
        isEmailVerified: false,
        purchasedsubCourses: [],
      },
      {
        fullName: 'User Three',
        mobileNumber: '+918765432109',
        isNumberVerified: false,
        role: 'user',
        isEmailVerified: false,
        purchasedsubCourses: [],
      },
      {
        fullName: 'User Four',
        mobileNumber: '+917654321098',
        isNumberVerified: true,
        role: 'user',
        isEmailVerified: true,
        purchasedsubCourses: [],
      },
      {
        fullName: 'User Five',
        mobileNumber: '+916543210987',
        isNumberVerified: true,
        role: 'user',
        isEmailVerified: false,
        purchasedsubCourses: [],
      },
      {
        fullName: 'User Six',
        mobileNumber: '+915432109876',
        isNumberVerified: false,
        role: 'user',
        isEmailVerified: false,
        purchasedsubCourses: [],
      },
    ]);
    console.log(`Created ${users.length} users`);

    // Create User Profiles
    console.log('Creating user profiles...');
    await UserProfile.insertMany([
      {
        userId: users[0]._id,
        profileImageUrl: imageUrl,
        address: '456 User Ave',
        email: 'user1@example.com',
      },
      {
        userId: users[1]._id,
        profileImageUrl: imageUrl,
        address: '789 User Blvd',
        email: 'user2@example.com',
      },
      {
        userId: users[2]._id,
        profileImageUrl: imageUrl,
        address: '101 User Ln',
        email: 'user3@example.com',
      },
      {
        userId: users[3]._id,
        profileImageUrl: imageUrl,
        address: '202 User St',
        email: 'user4@example.com',
      },
      {
        userId: users[4]._id,
        profileImageUrl: imageUrl,
        address: '303 User Rd',
        email: 'user5@example.com',
      },
      {
        userId: users[5]._id,
        profileImageUrl: imageUrl,
        address: '404 User Pl',
        email: 'user6@example.com',
      },
    ]);
    console.log('User profiles created');

    // 5. Create Courses (4 courses)
    console.log('Creating courses...');
    const courses = await Course.insertMany([
      {
        adminId: admins[0]._id,
        courseName: 'Course A: Web Development',
        CoverImageUrl: imageUrl,
        CourseInternshipPrice: 500,
        certificateDescription: 'Master web development skills.',
      },
      {
        adminId: admins[0]._id,
        courseName: 'Course B: Data Science',
        CoverImageUrl: imageUrl,
        CourseInternshipPrice: 1000,
        certificateDescription: 'Dive into data analysis and ML.',
      },
      {
        adminId: admins[0]._id,
        courseName: 'Course C: Mobile Development',
        CoverImageUrl: imageUrl,
        CourseInternshipPrice: 800,
        certificateDescription: 'Build mobile apps with ease.',
      },
      {
        adminId: admins[0]._id,
        courseName: 'Course D: AI Fundamentals',
        CoverImageUrl: imageUrl,
        CourseInternshipPrice: 1200,
        certificateDescription: 'Learn the basics of AI.',
      },
    ]);
    console.log(`Created ${courses.length} courses`);

    // 6. Create Subcourses (8 subcourses, 2 per course)
    console.log('Creating subcourses...');
    const subcourses = await Subcourse.insertMany([
      // Course A
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseName: 'SubA1: HTML Basics',
        subCourseDescription: 'Learn HTML from scratch.',
        price: 0,
        certificatePrice: 0,
        certificateDescription: 'HTML certification.',
        introVideoUrl: videoUrl,
        totalLessons: 4,
        totalStudentsEnrolled: 0,
        totalDuration: '4 hours',
        avgRating: 0,
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
        isbestSeller: true,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseName: 'SubA2: JavaScript Advanced',
        subCourseDescription: 'Advanced JS concepts.',
        price: 200,
        certificatePrice: 50,
        certificateDescription: 'JS advanced cert.',
        introVideoUrl: videoUrl,
        totalLessons: 4,
        totalStudentsEnrolled: 0,
        totalDuration: '5 hours',
        avgRating: 0,
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
        isbestSeller: false,
      },
      // Course B
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseName: 'SubB1: Python for Data',
        subCourseDescription: 'Python basics for data science.',
        price: 300,
        certificatePrice: 100,
        certificateDescription: 'Python data cert.',
        introVideoUrl: videoUrl,
        totalLessons: 4,
        totalStudentsEnrolled: 0,
        totalDuration: '4 hours',
        avgRating: 0,
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
        isbestSeller: true,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseName: 'SubB2: Machine Learning Intro',
        subCourseDescription: 'Introduction to ML algorithms.',
        price: 400,
        certificatePrice: 150,
        certificateDescription: 'ML basics cert.',
        introVideoUrl: videoUrl,
        totalLessons: 5,
        totalStudentsEnrolled: 0,
        totalDuration: '6 hours',
        avgRating: 0,
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
        isbestSeller: false,
      },
      // Course C
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseName: 'SubC1: Android Development',
        subCourseDescription: 'Build Android apps.',
        price: 250,
        certificatePrice: 75,
        certificateDescription: 'Android certification.',
        introVideoUrl: videoUrl,
        totalLessons: 4,
        totalStudentsEnrolled: 0,
        totalDuration: '5 hours',
        avgRating: 0,
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
        isbestSeller: true,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseName: 'SubC2: iOS Development',
        subCourseDescription: 'Create iOS applications.',
        price: 300,
        certificatePrice: 100,
        certificateDescription: 'iOS certification.',
        introVideoUrl: videoUrl,
        totalLessons: 4,
        totalStudentsEnrolled: 0,
        totalDuration: '5 hours',
        avgRating: 0,
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
        isbestSeller: false,
      },
      // Course D
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseName: 'SubD1: AI Basics',
        subCourseDescription: 'Fundamentals of artificial intelligence.',
        price: 0,
        certificatePrice: 0,
        certificateDescription: 'AI basics certification.',
        introVideoUrl: videoUrl,
        totalLessons: 4,
        totalStudentsEnrolled: 0,
        totalDuration: '3 hours',
        avgRating: 0,
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
        isbestSeller: true,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseName: 'SubD2: Neural Networks',
        subCourseDescription: 'Introduction to neural networks.',
        price: 500,
        certificatePrice: 200,
        certificateDescription: 'Neural networks cert.',
        introVideoUrl: videoUrl,
        totalLessons: 5,
        totalStudentsEnrolled: 0,
        totalDuration: '7 hours',
        avgRating: 0,
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
        isbestSeller: false,
      },
    ]);
    console.log(`Created ${subcourses.length} subcourses`);

    // 7. Create Lessons (4 lessons per subcourse, except SubB2 and SubD2 which have 5, total 34 lessons)
    console.log('Creating lessons...');
    const lessons = [
      // SubA1: HTML Basics (4 lessons)
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[0]._id,
        lessonName: 'Lesson 1: Intro to HTML',
        classLink: 'https://zoom.us/j/123',
        date: new Date('2025-09-01'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Introduction to HTML.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[0]._id,
        lessonName: 'Lesson 2: HTML Tags',
        classLink: 'https://zoom.us/j/124',
        date: new Date('2025-09-02'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'HTML tags and structure.',
        duration: '1 hour',
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[0]._id,
        lessonName: 'Lesson 3: HTML Forms',
        classLink: 'https://zoom.us/j/125',
        date: new Date('2025-09-03'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Building HTML forms.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[0]._id,
        lessonName: 'Lesson 4: Semantic HTML',
        classLink: 'https://zoom.us/j/126',
        date: new Date('2025-09-04'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Using semantic HTML.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      // SubA2: JavaScript Advanced (4 lessons)
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[1]._id,
        lessonName: 'Lesson 1: JS Basics',
        classLink: 'https://zoom.us/j/127',
        date: new Date('2025-09-05'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'JavaScript introduction.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[1]._id,
        lessonName: 'Lesson 2: JS Functions',
        classLink: 'https://zoom.us/j/128',
        date: new Date('2025-09-06'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Advanced functions in JS.',
        duration: '1 hour',
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[1]._id,
        lessonName: 'Lesson 3: JS Async',
        classLink: 'https://zoom.us/j/129',
        date: new Date('2025-09-07'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Asynchronous JavaScript.',
        duration: '1.5 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[1]._id,
        lessonName: 'Lesson 4: JS Projects',
        classLink: 'https://zoom.us/j/130',
        date: new Date('2025-09-08'),
        startTime: '10:00',
        endTime: '12:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Building JS projects.',
        duration: '2 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      // SubB1: Python for Data (4 lessons)
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[2]._id,
        lessonName: 'Lesson 1: Python Intro',
        classLink: 'https://zoom.us/j/131',
        date: new Date('2025-09-09'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Python basics.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[2]._id,
        lessonName: 'Lesson 2: Data Structures',
        classLink: 'https://zoom.us/j/132',
        date: new Date('2025-09-10'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Lists and dictionaries.',
        duration: '1.5 hours',
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[2]._id,
        lessonName: 'Lesson 3: Pandas',
        classLink: 'https://zoom.us/j/133',
        date: new Date('2025-09-11'),
        startTime: '10:00',
        endTime: '11:30',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Data manipulation with Pandas.',
        duration: '1.5 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[2]._id,
        lessonName: 'Lesson 4: Data Visualization',
        classLink: 'https://zoom.us/j/134',
        date: new Date('2025-09-12'),
        startTime: '10:00',
        endTime: '11:30',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Visualizing data with Python.',
        duration: '1.5 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      // SubB2: Machine Learning Intro (5 lessons)
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[3]._id,
        lessonName: 'Lesson 1: ML Basics',
        classLink: 'https://zoom.us/j/135',
        date: new Date('2025-09-13'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Introduction to ML.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[3]._id,
        lessonName: 'Lesson 2: Supervised Learning',
        classLink: 'https://zoom.us/j/136',
        date: new Date('2025-09-14'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Supervised ML algorithms.',
        duration: '1.5 hours',
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[3]._id,
        lessonName: 'Lesson 3: Unsupervised Learning',
        classLink: 'https://zoom.us/j/137',
        date: new Date('2025-09-15'),
        startTime: '10:00',
        endTime: '11:30',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Unsupervised ML techniques.',
        duration: '1.5 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[3]._id,
        lessonName: 'Lesson 4: ML Projects',
        classLink: 'https://zoom.us/j/138',
        date: new Date('2025-09-16'),
        startTime: '10:00',
        endTime: '12:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Building ML projects.',
        duration: '2 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[3]._id,
        lessonName: 'Lesson 5: ML Evaluation',
        classLink: 'https://zoom.us/j/139',
        date: new Date('2025-09-17'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Evaluating ML models.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      // SubC1: Android Development (4 lessons)
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[4]._id,
        lessonName: 'Lesson 1: Android Intro',
        classLink: 'https://zoom.us/j/140',
        date: new Date('2025-09-18'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Introduction to Android.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[4]._id,
        lessonName: 'Lesson 2: Android UI',
        classLink: 'https://zoom.us/j/141',
        date: new Date('2025-09-19'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Building Android UI.',
        duration: '1 hour',
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[4]._id,
        lessonName: 'Lesson 3: Android Networking',
        classLink: 'https://zoom.us/j/142',
        date: new Date('2025-09-20'),
        startTime: '10:00',
        endTime: '11:30',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Networking in Android.',
        duration: '1.5 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[4]._id,
        lessonName: 'Lesson 4: Android Projects',
        classLink: 'https://zoom.us/j/143',
        date: new Date('2025-09-21'),
        startTime: '10:00',
        endTime: '12:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Building Android projects.',
        duration: '2 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      // SubC2: iOS Development (4 lessons)
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[5]._id,
        lessonName: 'Lesson 1: iOS Intro',
        classLink: 'https://zoom.us/j/144',
        date: new Date('2025-09-22'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Introduction to iOS.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[5]._id,
        lessonName: 'Lesson 2: Swift Basics',
        classLink: 'https://zoom.us/j/145',
        date: new Date('2025-09-23'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Learning Swift programming.',
        duration: '1 hour',
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[5]._id,
        lessonName: 'Lesson 3: iOS UI',
        classLink: 'https://zoom.us/j/146',
        date: new Date('2025-09-24'),
        startTime: '10:00',
        endTime: '11:30',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Building iOS UI.',
        duration: '1.5 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[5]._id,
        lessonName: 'Lesson 4: iOS Projects',
        classLink: 'https://zoom.us/j/147',
        date: new Date('2025-09-25'),
        startTime: '10:00',
        endTime: '12:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Building iOS projects.',
        duration: '2 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      // SubD1: AI Basics (4 lessons)
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[6]._id,
        lessonName: 'Lesson 1: AI Intro',
        classLink: 'https://zoom.us/j/148',
        date: new Date('2025-09-26'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Introduction to AI.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[6]._id,
        lessonName: 'Lesson 2: AI History',
        classLink: 'https://zoom.us/j/149',
        date: new Date('2025-09-27'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'History of AI.',
        duration: '1 hour',
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[6]._id,
        lessonName: 'Lesson 3: AI Applications',
        classLink: 'https://zoom.us/j/150',
        date: new Date('2025-09-28'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Real-world AI applications.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[6]._id,
        lessonName: 'Lesson 4: AI Ethics',
        classLink: 'https://zoom.us/j/151',
        date: new Date('2025-09-29'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Ethics in AI.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      // SubD2: Neural Networks (5 lessons)
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[7]._id,
        lessonName: 'Lesson 1: Neural Intro',
        classLink: 'https://zoom.us/j/152',
        date: new Date('2025-09-30'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Introduction to neural networks.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[7]._id,
        lessonName: 'Lesson 2: Neural Architecture',
        classLink: 'https://zoom.us/j/153',
        date: new Date('2025-10-01'),
        startTime: '10:00',
        endTime: '11:30',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Neural network architecture.',
        duration: '1.5 hours',
        LiveStatus: true,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[7]._id,
        lessonName: 'Lesson 3: Training Networks',
        classLink: 'https://zoom.us/j/154',
        date: new Date('2025-10-02'),
        startTime: '10:00',
        endTime: '11:30',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Training neural networks.',
        duration: '1.5 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[7]._id,
        lessonName: 'Lesson 4: Neural Projects',
        classLink: 'https://zoom.us/j/155',
        date: new Date('2025-10-03'),
        startTime: '10:00',
        endTime: '12:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Building neural network projects.',
        duration: '2 hours',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
      {
        adminId: admins[0]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[7]._id,
        lessonName: 'Lesson 5: Neural Optimization',
        classLink: 'https://zoom.us/j/156',
        date: new Date('2025-10-04'),
        startTime: '10:00',
        endTime: '11:00',
        recordedVideoLink: videoUrl,
        introVideoUrl: videoUrl,
        description: 'Optimizing neural networks.',
        duration: '1 hour',
        LiveStatus: false,
        thumbnailImageUrl: imageUrl,
      },
    ];
    const createdLessons = await Lesson.insertMany(lessons);
    console.log(`Created ${createdLessons.length} lessons`);

    // Assign lesson IDs for reference (group by subcourse)
    const lessonsBySubcourse = {
      subA1: createdLessons.slice(0, 4),
      subA2: createdLessons.slice(4, 8),
      subB1: createdLessons.slice(8, 12),
      subB2: createdLessons.slice(12, 17),
      subC1: createdLessons.slice(17, 21),
      subC2: createdLessons.slice(21, 25),
      subD1: createdLessons.slice(25, 29),
      subD2: createdLessons.slice(29, 34),
    };

    // 8. Enroll Users in Subcourses (multiple enrollments per user)
    console.log('Enrolling users in subcourses...');
    const userCourses = [
      // User 1: Enrolled in SubA1 (free, completed), SubA2 (paid, not started), SubB1 (paid, completed)
      {
        userId: users[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[0]._id,
        isCompleted: true,
        progress: '100%',
        paymentStatus: true,
        paymentAmount: 0,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[0]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[1]._id,
        isCompleted: false,
        progress: '0%', // Changed to not started for 50% course completion
        paymentStatus: true,
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_456',
        razorpaySignature: 'sig_789',
        paymentAmount: 200,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[0]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[2]._id,
        isCompleted: true,
        progress: '100%',
        paymentStatus: true,
        razorpayOrderId: 'order_124',
        razorpayPaymentId: 'pay_457',
        razorpaySignature: 'sig_790',
        paymentAmount: 300,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      // User 2: Enrolled in SubA1 (free, not completed), SubC1 (paid, partial)
      {
        userId: users[1]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[0]._id,
        isCompleted: false,
        progress: '0%',
        paymentStatus: true,
        paymentAmount: 0,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[1]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[4]._id,
        isCompleted: false,
        progress: '25%',
        paymentStatus: true,
        razorpayOrderId: 'order_125',
        razorpayPaymentId: 'pay_458',
        razorpaySignature: 'sig_791',
        paymentAmount: 250,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      // User 3: Enrolled in SubB1 (paid, pending), SubD1 (free, completed)
      {
        userId: users[2]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[2]._id,
        isCompleted: false,
        progress: '0%',
        paymentStatus: false,
        razorpayOrderId: 'order_999',
      },
      {
        userId: users[2]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[6]._id,
        isCompleted: true,
        progress: '100%',
        paymentStatus: true,
        paymentAmount: 0,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      // User 4: Enrolled in SubA2 (paid, completed), SubC2 (paid, completed)
      {
        userId: users[3]._id,
        courseId: courses[0]._id,
        subcourseId: subcourses[1]._id,
        isCompleted: true,
        progress: '100%',
        paymentStatus: true,
        razorpayOrderId: 'order_126',
        razorpayPaymentId: 'pay_459',
        razorpaySignature: 'sig_792',
        paymentAmount: 200,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[3]._id,
        courseId: courses[2]._id,
        subcourseId: subcourses[5]._id,
        isCompleted: true, // Changed to completed
        progress: '100%', // Changed to 100%
        paymentStatus: true,
        razorpayOrderId: 'order_127',
        razorpayPaymentId: 'pay_460',
        razorpaySignature: 'sig_793',
        paymentAmount: 300,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      // User 5: Enrolled in SubB2 (paid, not completed), SubD2 (paid, partial)
      {
        userId: users[4]._id,
        courseId: courses[1]._id,
        subcourseId: subcourses[3]._id,
        isCompleted: false,
        progress: '0%',
        paymentStatus: true,
        razorpayOrderId: 'order_128',
        razorpayPaymentId: 'pay_461',
        razorpaySignature: 'sig_794',
        paymentAmount: 400,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[4]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[7]._id,
        isCompleted: false,
        progress: '60%',
        paymentStatus: true,
        razorpayOrderId: 'order_129',
        razorpayPaymentId: 'pay_462',
        razorpaySignature: 'sig_795',
        paymentAmount: 500,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      // User 6: Enrolled in SubD1 (free, not completed)
      {
        userId: users[5]._id,
        courseId: courses[3]._id,
        subcourseId: subcourses[6]._id,
        isCompleted: false,
        progress: '0%',
        paymentStatus: true,
        paymentAmount: 0,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
    ];
    const createdUserCourses = await UserCourse.insertMany(userCourses);
    console.log(`Created ${createdUserCourses.length} user courses`);

    // Update user's purchasedsubCourses and subcourse enrollment counts
    console.log('Updating purchased subcourses and enrollment counts...');
    users[0].purchasedsubCourses.push(subcourses[0]._id, subcourses[1]._id, subcourses[2]._id);
    users[1].purchasedsubCourses.push(subcourses[0]._id, subcourses[4]._id);
    users[2].purchasedsubCourses.push(subcourses[2]._id, subcourses[6]._id);
    users[3].purchasedsubCourses.push(subcourses[1]._id, subcourses[5]._id);
    users[4].purchasedsubCourses.push(subcourses[3]._id, subcourses[7]._id);
    users[5].purchasedsubCourses.push(subcourses[6]._id);
    await Promise.all(users.map(user => user.save()));
    console.log('Updated user purchased subcourses');

    subcourses[0].totalStudentsEnrolled = 2; // User 1, User 2
    subcourses[1].totalStudentsEnrolled = 2; // User 1, User 4
    subcourses[2].totalStudentsEnrolled = 2; // User 1, User 3 (pending payment)
    subcourses[3].totalStudentsEnrolled = 1; // User 5
    subcourses[4].totalStudentsEnrolled = 1; // User 2
    subcourses[5].totalStudentsEnrolled = 1; // User 4
    subcourses[6].totalStudentsEnrolled = 2; // User 3, User 6
    subcourses[7].totalStudentsEnrolled = 1; // User 5
    await Promise.all(subcourses.map(sub => sub.save()));
    console.log('Updated subcourse enrollment counts');

    // 9. User Lessons (for users enrolled in subcourses)
    console.log('Creating user lesson completions...');
    const userLessons = [
      // User 1: Completed SubA1, not started SubA2, completed SubB1
      ...lessonsBySubcourse.subA1.map(lesson => ({
        userId: users[0]._id,
        lessonId: lesson._id,
        isCompleted: true,
      })),
      ...lessonsBySubcourse.subA2.map(lesson => ({
        userId: users[0]._id,
        lessonId: lesson._id,
        isCompleted: false, // Changed to not completed for 50% course completion
      })),
      ...lessonsBySubcourse.subB1.map(lesson => ({
        userId: users[0]._id,
        lessonId: lesson._id,
        isCompleted: true,
      })),
      // User 2: Not completed SubA1, partial SubC1
      ...lessonsBySubcourse.subA1.map(lesson => ({
        userId: users[1]._id,
        lessonId: lesson._id,
        isCompleted: false,
      })),
      ...lessonsBySubcourse.subC1.slice(0, 1).map(lesson => ({
        userId: users[1]._id,
        lessonId: lesson._id,
        isCompleted: true,
      })),
      ...lessonsBySubcourse.subC1.slice(1).map(lesson => ({
        userId: users[1]._id,
        lessonId: lesson._id,
        isCompleted: false,
      })),
      // User 3: Not completed SubB1 (pending payment), completed SubD1
      ...lessonsBySubcourse.subB1.map(lesson => ({
        userId: users[2]._id,
        lessonId: lesson._id,
        isCompleted: false,
      })),
      ...lessonsBySubcourse.subD1.map(lesson => ({
        userId: users[2]._id,
        lessonId: lesson._id,
        isCompleted: true,
      })),
      // User 4: Completed SubA2, completed SubC2
      ...lessonsBySubcourse.subA2.map(lesson => ({
        userId: users[3]._id,
        lessonId: lesson._id,
        isCompleted: true,
      })),
      ...lessonsBySubcourse.subC2.map(lesson => ({
        userId: users[3]._id,
        lessonId: lesson._id,
        isCompleted: true, // Changed to completed for all lessons
      })),
      // User 5: Not completed SubB2, partial SubD2
      ...lessonsBySubcourse.subB2.map(lesson => ({
        userId: users[4]._id,
        lessonId: lesson._id,
        isCompleted: false,
      })),
      ...lessonsBySubcourse.subD2.slice(0, 3).map(lesson => ({
        userId: users[4]._id,
        lessonId: lesson._id,
        isCompleted: true,
      })),
      ...lessonsBySubcourse.subD2.slice(3).map(lesson => ({
        userId: users[4]._id,
        lessonId: lesson._id,
        isCompleted: false,
      })),
      // User 6: Not completed SubD1
      ...lessonsBySubcourse.subD1.map(lesson => ({
        userId: users[5]._id,
        lessonId: lesson._id,
        isCompleted: false,
      })),
    ];
    await UserLesson.insertMany(userLessons);
    console.log('User lesson completions created');

    // 10. Favourites (users liking subcourses)
    console.log('Creating favourites...');
    await Favourite.insertMany([
      { userId: users[0]._id, subcourseId: subcourses[0]._id, isLike: true },
      { userId: users[0]._id, subcourseId: subcourses[2]._id, isLike: true },
      { userId: users[1]._id, subcourseId: subcourses[4]._id, isLike: true },
      { userId: users[2]._id, subcourseId: subcourses[6]._id, isLike: true },
      { userId: users[3]._id, subcourseId: subcourses[1]._id, isLike: true },
      { userId: users[4]._id, subcourseId: subcourses[3]._id, isLike: true },
      { userId: users[5]._id, subcourseId: subcourses[6]._id, isLike: true },
    ]);
    console.log('Favourites created');

    // 11. Ratings (users rating subcourses)
    console.log('Creating ratings...');
    const ratings = [
      { userId: users[0]._id, subcourseId: subcourses[0]._id, rating: 5 },
      { userId: users[0]._id, subcourseId: subcourses[2]._id, rating: 4.5 },
      { userId: users[1]._id, subcourseId: subcourses[0]._id, rating: 4.5 },
      { userId: users[1]._id, subcourseId: subcourses[4]._id, rating: 3.5 },
      { userId: users[2]._id, subcourseId: subcourses[6]._id, rating: 5 },
      { userId: users[3]._id, subcourseId: subcourses[1]._id, rating: 4.8 },
      { userId: users[3]._id, subcourseId: subcourses[5]._id, rating: 4 },
      { userId: users[4]._id, subcourseId: subcourses[3]._id, rating: 3 },
    ];
    await Rating.insertMany(ratings);
    console.log('Ratings created');

    // Update avgRating for subcourses
    console.log('Updating subcourse average ratings...');
    subcourses[0].avgRating = (5 + 4.5) / 2; // SubA1
    subcourses[1].avgRating = 4.8; // SubA2
    subcourses[2].avgRating = 4.5; // SubB1
    subcourses[3].avgRating = 3; // SubB2
    subcourses[4].avgRating = 3.5; // SubC1
    subcourses[5].avgRating = 4; // SubC2
    subcourses[6].avgRating = 5; // SubD1
    subcourses[7].avgRating = 0; // SubD2 (no ratings)
    await Promise.all(subcourses.map(sub => sub.save()));
    console.log('Updated subcourse average ratings');

    // 12. User Main Courses
    console.log('Creating user main courses...');
    await UserMainCourse.insertMany([
      {
        userId: users[0]._id,
        courseId: courses[0]._id,
        status: 'Course Pending', // Changed to reflect 50% completion
        isCompleted: false, // Changed to reflect 50% completion
        isCertificateDownloaded: false,
      },
      {
        userId: users[0]._id,
        courseId: courses[1]._id,
        status: 'Course Completed',
        isCompleted: true,
        isCertificateDownloaded: false,
      },
      {
        userId: users[1]._id,
        courseId: courses[0]._id,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      },
      {
        userId: users[1]._id,
        courseId: courses[2]._id,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      },
      {
        userId: users[2]._id,
        courseId: courses[3]._id,
        status: 'Certified Learner',
        isCompleted: true,
        isCertificateDownloaded: false,
      },
      {
        userId: users[3]._id,
        courseId: courses[0]._id,
        status: 'Course Completed',
        isCompleted: true,
        isCertificateDownloaded: true,
      },
      {
        userId: users[3]._id,
        courseId: courses[2]._id,
        status: 'Course Completed', // Changed to reflect SubC2 completion
        isCompleted: true,
        isCertificateDownloaded: false,
      },
      {
        userId: users[4]._id,
        courseId: courses[1]._id,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      },
      {
        userId: users[4]._id,
        courseId: courses[3]._id,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      },
      {
        userId: users[5]._id,
        courseId: courses[3]._id,
        status: 'Course Pending',
        isCompleted: false,
        isCertificateDownloaded: false,
      },
    ]);
    console.log('User main courses created');

    // 13. Internship Letters
    console.log('Creating internship letters...');
    await InternshipLetter.insertMany([
      {
        userId: users[0]._id,
        courseId: courses[0]._id,
        internshipLetter: 'https://s3.amazonaws.com/internship-letter-user1.pdf',
        paymentStatus: true,
        uploadStatus: 'uploaded',
        razorpayOrderId: 'order_int1',
        razorpayPaymentId: 'pay_int1',
        razorpaySignature: 'sig_int1',
        paymentAmount: 500,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[0]._id,
        courseId: courses[1]._id,
        internshipLetter: 'https://s3.amazonaws.com/internship-letter-user1b.pdf',
        paymentStatus: true,
        uploadStatus: 'uploaded',
        razorpayOrderId: 'order_int2',
        razorpayPaymentId: 'pay_int2',
        razorpaySignature: 'sig_int2',
        paymentAmount: 1000,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[1]._id,
        courseId: courses[0]._id,
        internshipLetter: '',
        paymentStatus: false,
        uploadStatus: 'upload',
      },
      {
        userId: users[2]._id,
        courseId: courses[3]._id,
        internshipLetter: 'https://s3.amazonaws.com/internship-letter-user3.pdf',
        paymentStatus: true,
        uploadStatus: 'uploaded',
        razorpayOrderId: 'order_int3',
        razorpayPaymentId: 'pay_int3',
        razorpaySignature: 'sig_int3',
        paymentAmount: 1200,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[3]._id,
        courseId: courses[0]._id,
        internshipLetter: 'https://s3.amazonaws.com/internship-letter-user4.pdf',
        paymentStatus: true,
        uploadStatus: 'uploaded',
        razorpayOrderId: 'order_int4',
        razorpayPaymentId: 'pay_int4',
        razorpaySignature: 'sig_int4',
        paymentAmount: 500,
        paymentCurrency: 'INR',
        paymentDate: new Date(),
      },
      {
        userId: users[4]._id,
        courseId: courses[1]._id,
        internshipLetter: '',
        paymentStatus: false,
        uploadStatus: 'upload',
      },
    ]);
    console.log('Internship letters created');

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    console.log('Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedDatabase();