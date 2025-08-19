const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth');
const Lesson = require('../../../course/models/lesson');
const UserLesson = require('../../models/UserCourse/userLesson');
const UserCourse = require('../../models/UserCourse/userCourse');
const UsermainCourse = require('../../models/UserCourse/usermainCourse');
const Subcourse = require('../../../course/models/subcourse');
const { apiResponse } = require('../../../utils/apiResponse');

exports.handleMarkLessonCompleted = async (req, res) => {
  try {
    const userId = req.userId;
    const { lessonId } = req.body;

    console.log('handleMarkLessonCompleted - Input:', { userId, lessonId });

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(lessonId)) {
      console.log('handleMarkLessonCompleted - Invalid input:', { userId, lessonId });
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or lessonId',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    console.log('handleMarkLessonCompleted - User query result:', user ? 'Found' : 'Not found', { userId });
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if lesson exists
    const lesson = await Lesson.findById(lessonId);
    console.log('handleMarkLessonCompleted - Lesson query result:', lesson ? 'Found' : 'Not found', { lessonId });
    if (!lesson) {
      return apiResponse(res, {
        success: false,
        message: 'Lesson not found',
        statusCode: 404,
      });
    }

    // Check if user has purchased the subcourse
    console.log('handleMarkLessonCompleted - Checking purchasedsubCourses:', { purchasedsubCourses: user.purchasedsubCourses, subcourseId: lesson.subcourseId });
    if (!user.purchasedsubCourses.includes(lesson.subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Access denied: Subcourse not purchased',
        statusCode: 403,
      });
    }

    // Create or update userLesson entry
    let userLesson = await UserLesson.findOne({ userId, lessonId });
    console.log('handleMarkLessonCompleted - UserLesson query result:', userLesson ? 'Found' : 'Not found', { userId, lessonId });
    if (!userLesson) {
      userLesson = new UserLesson({
        userId,
        lessonId,
        isCompleted: true,
      });
    } else if (!userLesson.isCompleted) {
      userLesson.isCompleted = true;
    } else {
      console.log('handleMarkLessonCompleted - Lesson already completed:', { userId, lessonId });
      return apiResponse(res, {
        success: false,
        message: 'Lesson(cards) already marked as completed',
        statusCode: 400,
      });
    }

    await userLesson.save();
    console.log('handleMarkLessonCompleted - UserLesson saved:', { userLessonId: userLesson._id, isCompleted: userLesson.isCompleted });

    // Update userCourse progress
    const subcourseId = lesson.subcourseId;
    const subcourse = await Subcourse.findById(subcourseId);
    console.log('handleMarkLessonCompleted - Subcourse query result:', subcourse ? 'Found' : 'Not found', { subcourseId });
    if (!subcourse) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    const userCourse = await UserCourse.findOne({ userId, subcourseId });
    console.log('handleMarkLessonCompleted - UserCourse query result:', userCourse ? 'Found' : 'Not found', { userId, subcourseId });
    if (!userCourse) {
      return apiResponse(res, {
        success: false,
        message: 'UserCourse not found',
        statusCode: 404,
      });
    }

    // Calculate subcourse progress
    const lessons = await Lesson.find({ subcourseId });
    const completedLessons = await UserLesson.countDocuments({ userId, lessonId: { $in: lessons.map(l => l._id) }, isCompleted: true });
    const totalLessons = subcourse.totalLessons;
    const progressPercentage = totalLessons > 0 ? ((completedLessons / totalLessons) * 100).toFixed(2) + '%' : '0%';
    console.log('handleMarkLessonCompleted - Progress calculation:', { completedLessons, totalLessons, progressPercentage });

    userCourse.progress = progressPercentage;
    userCourse.isCompleted = completedLessons >= totalLessons && totalLessons > 0;
    console.log('handleMarkLessonCompleted - UserCourse update:', { progress: userCourse.progress, isCompleted: userCourse.isCompleted });

    await userCourse.save();
    console.log('handleMarkLessonCompleted - UserCourse saved:', { userCourseId: userCourse._id });

    // Update usermainCourse status
    const usermainCourse = await UsermainCourse.findOne({ userId, courseId: userCourse.courseId });
    console.log('handleMarkLessonCompleted - UsermainCourse query result:', usermainCourse ? 'Found' : 'Not found', { userId, courseId: userCourse.courseId });
    if (!usermainCourse) {
      return apiResponse(res, {
        success: false,
        message: 'UsermainCourse not found',
        statusCode: 404,
      });
    }

    // Count total subcourses for the main course and check completion
    const subcourses = await Subcourse.find({ courseId: userCourse.courseId });
    const totalSubcourses = subcourses.length;
    const completedSubcourses = await UserCourse.countDocuments({
      userId,
      courseId: userCourse.courseId,
      isCompleted: true,
    });
    console.log('handleMarkLessonCompleted - Subcourse completion check:', { totalSubcourses, completedSubcourses });

    if (completedSubcourses >= totalSubcourses && totalSubcourses > 0) {
      usermainCourse.isCompleted = true;
      usermainCourse.status = 'Course Completed';
      await usermainCourse.save();
      console.log('handleMarkLessonCompleted - UsermainCourse updated:', { usermainCourseId: usermainCourse._id, isCompleted: usermainCourse.isCompleted, status: usermainCourse.status });
    }

    return apiResponse(res, {
      success: true,
      message: 'Lesson marked as completed and progress updated',
      data: {
        userLesson,
        userCourse: {
          subcourseId,
          progress: userCourse.progress,
          isCompleted: userCourse.isCompleted,
        },
        usermainCourse: {
          courseId: usermainCourse.courseId,
          isCompleted: usermainCourse.isCompleted,
          status: usermainCourse.status,
        },
      },
      statusCode: 200,
    });

  } catch (error) {
    console.error('handleMarkLessonCompleted - Error:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to mark lesson as completed: ${error.message}`,
      statusCode: 500,
    });
  }
};