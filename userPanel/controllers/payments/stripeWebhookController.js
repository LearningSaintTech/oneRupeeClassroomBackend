const mongoose = require('mongoose');
const stripe = require('../../../config/stripe');
const { apiResponse } = require('../../../utils/apiResponse');
const User = require('../../models/Auth/Auth');
const UserCourse = require('../../models/UserCourse/userCourse');
const UsermainCourse = require('../../models/UserCourse/usermainCourse');
const RecordedLesson = require('../../models/recordedLesson/recordedLesson');
const CertificatePayment = require('../../models/certificates/certificate');
const InternshipLetter = require('../../../adminPanel/models/InternshipLetter/internshipLetter');
const Subcourse = require('../../../adminPanel/models/course/subcourse');
const NotificationService = require('../../../Notification/controller/notificationServiceController');
const { emitBuyCourse } = require('../../../socket/emitters');
const StripeWebhookEvent = require('../../models/payments/stripeWebhookEvent');

function normalizeIntentPaymentFields(intent) {
  return {
    stripePaymentIntentId: intent.id,
    stripeChargeId: intent.latest_charge ? String(intent.latest_charge) : undefined,
    stripePaymentMethodId: intent.payment_method ? String(intent.payment_method) : undefined,
    paymentAmount: typeof intent.amount_received === 'number' ? intent.amount_received / 100 : undefined,
    paymentCurrency: (intent.currency || 'usd').toUpperCase(),
    paymentDate: new Date(),
  };
}

async function handleBuyCourseSuccess(intent, req) {
  const { subcourseId, userId } = intent.metadata || {};
  if (!userId || !subcourseId) return;

  const userCourse = await UserCourse.findOne({ stripePaymentIntentId: intent.id });
  if (!userCourse) return;

  const fields = normalizeIntentPaymentFields(intent);
  userCourse.paymentStatus = true;
  userCourse.stripeChargeId = fields.stripeChargeId;
  userCourse.stripePaymentMethodId = fields.stripePaymentMethodId;
  userCourse.paymentAmount = fields.paymentAmount ?? userCourse.paymentAmount;
  userCourse.paymentCurrency = fields.paymentCurrency;
  userCourse.paymentDate = fields.paymentDate;
  await userCourse.save();

  const user = await User.findById(userId);
  const subcourse = await Subcourse.findById(subcourseId);
  if (!user || !subcourse) return;

  let usermainCourse = await UsermainCourse.findOne({
    userId,
    courseId: subcourse.courseId,
  });

  if (!usermainCourse) {
    usermainCourse = new UsermainCourse({
      userId,
      courseId: subcourse.courseId,
      status: 'Course Pending',
      isCompleted: false,
      isCertificateDownloaded: false,
    });
    await usermainCourse.save();
  }

  const alreadyPurchased = user.purchasedsubCourses.some((id) => id.toString() === subcourseId.toString());
  if (!alreadyPurchased) {
    user.purchasedsubCourses.push(subcourseId);
    await user.save();
    subcourse.totalStudentsEnrolled += 1;
    await subcourse.save();

    const io = req.app.get('io');
    const systemSenderId = new mongoose.Types.ObjectId();
    const notificationData = {
      recipientId: userId,
      senderId: systemSenderId,
      title: 'Subcourse Unlocked',
      body: `You have successfully enrolled in ${subcourse.subcourseName}. Start learning now!`,
      type: 'course_unlocked',
      data: {
        courseId: subcourse.courseId,
        subcourseId: subcourse._id,
      },
      createdAt: new Date(),
    };

    const notification = await NotificationService.createAndSendNotification(notificationData);
    if (io && notification) {
      emitBuyCourse(io, userId, {
        id: notification._id,
        title: notificationData.title,
        body: notificationData.body,
        type: notificationData.type,
        createdAt: notification.createdAt,
        courseId: subcourse.courseId,
        subcourseId: subcourse._id,
      });
    }
  }
}

async function handleRecordedLessonsSuccess(intent) {
  const recordedLesson = await RecordedLesson.findOne({ stripePaymentIntentId: intent.id });
  if (!recordedLesson) return;

  const fields = normalizeIntentPaymentFields(intent);
  recordedLesson.paymentStatus = true;
  recordedLesson.stripeChargeId = fields.stripeChargeId;
  recordedLesson.stripePaymentMethodId = fields.stripePaymentMethodId;
  recordedLesson.paymentAmount = fields.paymentAmount ?? recordedLesson.paymentAmount;
  recordedLesson.paymentCurrency = fields.paymentCurrency;
  recordedLesson.paymentDate = fields.paymentDate;
  await recordedLesson.save();
}

async function handleCertificateSuccess(intent) {
  const certificatePayment = await CertificatePayment.findOne({ stripePaymentIntentId: intent.id });
  if (!certificatePayment) return;

  const fields = normalizeIntentPaymentFields(intent);
  certificatePayment.paymentStatus = true;
  certificatePayment.stripeChargeId = fields.stripeChargeId;
  certificatePayment.stripePaymentMethodId = fields.stripePaymentMethodId;
  certificatePayment.paymentAmount = fields.paymentAmount ?? certificatePayment.paymentAmount;
  certificatePayment.paymentCurrency = fields.paymentCurrency;
  certificatePayment.paymentDate = fields.paymentDate;
  await certificatePayment.save();
}

async function handleInternshipLetterSuccess(intent) {
  const internshipLetter = await InternshipLetter.findOne({ stripePaymentIntentId: intent.id });
  if (!internshipLetter) return;

  const fields = normalizeIntentPaymentFields(intent);
  internshipLetter.paymentStatus = true;
  internshipLetter.uploadStatus = 'upload';
  internshipLetter.stripeChargeId = fields.stripeChargeId;
  internshipLetter.stripePaymentMethodId = fields.stripePaymentMethodId;
  internshipLetter.paymentAmount = fields.paymentAmount ?? internshipLetter.paymentAmount;
  internshipLetter.paymentCurrency = fields.paymentCurrency;
  internshipLetter.paymentDate = fields.paymentDate;
  await internshipLetter.save();
}

exports.handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return apiResponse(res, {
        success: false,
        message: 'Missing STRIPE_WEBHOOK_SECRET',
        statusCode: 500,
      });
    }

    if (!signature) {
      return apiResponse(res, {
        success: false,
        message: 'Missing Stripe signature header',
        statusCode: 400,
      });
    }

    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    const existingEvent = await StripeWebhookEvent.findOne({ eventId: event.id }).lean();
    if (existingEvent) {
      return res.status(200).json({ received: true, duplicate: true });
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const flow = intent.metadata?.flow;

      switch (flow) {
        case 'buy-course':
          await handleBuyCourseSuccess(intent, req);
          break;
        case 'recorded-lessons':
          await handleRecordedLessonsSuccess(intent);
          break;
        case 'subcourse-certificate':
        case 'main-course-certificate':
          await handleCertificateSuccess(intent);
          break;
        case 'internship-letter':
          await handleInternshipLetterSuccess(intent);
          break;
        default:
          break;
      }
    }

    await StripeWebhookEvent.create({
      eventId: event.id,
      eventType: event.type,
    });

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return res.status(400).json({ received: false, error: error.message });
  }
};

