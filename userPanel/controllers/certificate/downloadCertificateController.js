const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const User = require('../../models/Auth/Auth');
const Subcourse = require('../../../adminPanel/models/course/subcourse');
const CertificateTemplate = require('../../../adminPanel/models/Templates/certificateTemplate');
const UserCourse = require('../../models/UserCourse/userCourse');
const usermainCourse = require('../../models/UserCourse/usermainCourse');
const Course = require('../../../adminPanel/models/course/course');
const CertificatePayment = require('../../models/certificates/certificate');
const { apiResponse } = require('../../../utils/apiResponse');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const razorpayInstance = require('../../../config/razorpay');
const crypto = require('crypto');

// Request Subcourse Certificate Payment
exports.requestSubcourseCertificatePayment = async (req, res) => {
  try {
    const { subcourseId } = req.body;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, subcourseId: ${subcourseId}`);

    // Validate input
    if (!subcourseId) {
      console.log('[DEBUG] Subcourse ID missing in request body');
      return apiResponse(res, {
        success: false,
        message: 'Subcourse ID is required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`[DEBUG] Invalid subcourseId format: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if subcourse exists
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log(`[DEBUG] Subcourse not found for ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Check if user has completed the subcourse
    const userCourse = await UserCourse.findOne({ userId, subcourseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] Subcourse not completed or not enrolled - userId: ${userId}, subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not completed or not enrolled',
        statusCode: 403,
      });
    }

    // Check for existing certificate payment
    let certificatePayment = await CertificatePayment.findOne({ userId, subcourseId });

    if (certificatePayment && certificatePayment.paymentStatus === true) {
      console.log(`[DEBUG] Payment already completed for subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment already completed for this subcourse certificate',
        statusCode: 400,
      });
    }

    // Verify certificate price
    if (!subcourse.certificatePrice || subcourse.certificatePrice <= 0) {
      console.log(`[DEBUG] Certificate price not defined for subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Certificate price not defined for this subcourse',
        statusCode: 400,
      });
    }

    // Create Razorpay order
    const receipt = `subcert_${userId.toString().slice(0, 12)}_${Date.now().toString().slice(-8)}`;
    const orderOptions = {
      amount: subcourse.certificatePrice * 100, // Convert to paise
      currency: 'INR',
      receipt: receipt,
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
    if (!razorpayOrder || !razorpayOrder.id) {
      console.log('[DEBUG] Failed to create Razorpay order');
      return apiResponse(res, {
        success: false,
        message: 'Failed to create Razorpay order',
        statusCode: 500,
      });
    }

    if (certificatePayment && certificatePayment.paymentStatus === false) {
      // Update existing certificate payment with new Razorpay order
      certificatePayment.razorpayOrderId = razorpayOrder.id;
      certificatePayment.paymentAmount = subcourse.certificatePrice;
      certificatePayment.paymentCurrency = 'INR';
      certificatePayment.updatedAt = new Date();

      await certificatePayment.save();
      console.log(`[DEBUG] Certificate payment updated - subcourseId: ${subcourseId}, razorpayOrderId: ${razorpayOrder.id}`);
    } else {
      // Create new certificate payment request
      certificatePayment = new CertificatePayment({
        userId,
        subcourseId,
        paymentStatus: false,
        paymentAmount: subcourse.certificatePrice,
        paymentCurrency: 'INR',
        razorpayOrderId: razorpayOrder.id,
      });

      await certificatePayment.save();
      console.log(`[DEBUG] Certificate payment request created - subcourseId: ${subcourseId}, razorpayOrderId: ${razorpayOrder.id}`);
    }

    return apiResponse(res, {
      success: true,
      message: certificatePayment.isNew ? 'Subcourse certificate payment request created successfully' : 'Subcourse certificate payment request updated successfully',
      data: { certificatePayment, razorpayOrder },
      statusCode: 201,
    });
  } catch (error) {
    console.error('[DEBUG] Error in requestSubcourseCertificatePayment:', error);
    return apiResponse(res, {
      success: false,
      message: `Server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Request Main Course Certificate Payment
exports.requestMainCourseCertificatePayment = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, courseId: ${courseId}`);

    // Validate input
    if (!courseId) {
      console.log('[DEBUG] Course ID missing in request body');
      return apiResponse(res, {
        success: false,
        message: 'Course ID is required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`[DEBUG] Invalid courseId format: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      console.log(`[DEBUG] Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    // Check if user has completed the course
    const userCourse = await usermainCourse.findOne({ userId, courseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] Course not completed or not enrolled - userId: ${userId}, courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not completed or not enrolled',
        statusCode: 403,
      });
    }

    // Check for existing certificate payment
    let certificatePayment = await CertificatePayment.findOne({ userId, courseId });

    if (certificatePayment && certificatePayment.paymentStatus === true) {
      console.log(`[DEBUG] Payment already completed for courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment already completed for this course certificate',
        statusCode: 400,
      });
    }

    // Verify certificate price
    if (!course.courseCertificatePrice || course.courseCertificatePrice <= 0) {
      console.log(`[DEBUG] Certificate price not defined for courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Certificate price not defined for this course',
        statusCode: 400,
      });
    }

    // Create Razorpay order
    const receipt = `maincert_${userId.toString().slice(0, 12)}_${Date.now().toString().slice(-8)}`;
    const orderOptions = {
      amount: course.courseCertificatePrice * 100, // Convert to paise
      currency: 'INR',
      receipt: receipt,
    };

    const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
    if (!razorpayOrder || !razorpayOrder.id) {
      console.log('[DEBUG] Failed to create Razorpay order');
      return apiResponse(res, {
        success: false,
        message: 'Failed to create Razorpay order',
        statusCode: 500,
      });
    }

    if (certificatePayment && certificatePayment.paymentStatus === false) {
      // Update existing certificate payment with new Razorpay order
      certificatePayment.razorpayOrderId = razorpayOrder.id;
      certificatePayment.paymentAmount = course.courseCertificatePrice;
      certificatePayment.paymentCurrency = 'INR';
      certificatePayment.updatedAt = new Date();

      await certificatePayment.save();
      console.log(`[DEBUG] Certificate payment updated - courseId: ${courseId}, razorpayOrderId: ${razorpayOrder.id}`);
    } else {
      // Create new certificate payment request
      certificatePayment = new CertificatePayment({
        userId,
        courseId,
        paymentStatus: false,
        paymentAmount: course.courseCertificatePrice,
        paymentCurrency: 'INR',
        razorpayOrderId: razorpayOrder.id,
      });

      await certificatePayment.save();
      console.log(`[DEBUG] Certificate payment request created - courseId: ${courseId}, razorpayOrderId: ${razorpayOrder.id}`);
    }

    return apiResponse(res, {
      success: true,
      message: certificatePayment.isNew ? 'Main course certificate payment request created successfully' : 'Main course certificate payment request updated successfully',
      data: { certificatePayment, razorpayOrder },
      statusCode: 201,
    });
  } catch (error) {
    console.error('[DEBUG] Error in requestMainCourseCertificatePayment:', error);
    return apiResponse(res, {
      success: false,
      message: `Server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Verify Certificate Payment
exports.verifyCertificatePayment = async (req, res) => {
  try {
    const { certificatePaymentId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.userId;

    console.log(`[DEBUG] Verifying payment - certificatePaymentId: ${certificatePaymentId}, userId: ${userId}`);

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(certificatePaymentId)) {
      console.log('[DEBUG] Invalid certificate payment ID');
      return apiResponse(res, {
        success: false,
        message: 'Invalid certificate payment ID',
        statusCode: 400,
      });
    }

    // Find certificate payment request
    const certificatePayment = await CertificatePayment.findOne({ _id: certificatePaymentId, userId });
    if (!certificatePayment) {
      console.log(`[DEBUG] Certificate payment request not found or unauthorized - certificatePaymentId: ${certificatePaymentId}`);
      return apiResponse(res, {
        success: false,
        message: 'Certificate payment request not found or unauthorized',
        statusCode: 404,
      });
    }

    // Verify payment signature
    const sign = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayInstance.key_secret)
      .update(sign)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.log('[DEBUG] Payment signature verification failed');
      return apiResponse(res, {
        success: false,
        message: 'Payment signature verification failed',
        statusCode: 400,
      });
    }

    // Update payment details
    certificatePayment.paymentStatus = true;
    certificatePayment.razorpayOrderId = razorpayOrderId;
    certificatePayment.razorpayPaymentId = razorpayPaymentId;
    certificatePayment.razorpaySignature = razorpaySignature;
    certificatePayment.paymentDate = new Date();

    await certificatePayment.save();

    console.log(`[DEBUG] Payment verified - certificatePaymentId: ${certificatePaymentId}`);
    return apiResponse(res, {
      success: true,
      message: 'Payment verified and status updated successfully',
      data: certificatePayment,
      statusCode: 200,
    });
  } catch (error) {
    console.error('[DEBUG] Error in verifyCertificatePayment:', error);
    return apiResponse(res, {
      success: false,
      message: `Server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Download Subcourse Certificate
exports.downloadCertificate = async (req, res) => {
  try {
    const { subcourseId } = req.params;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, subcourseId: ${subcourseId}`);

    // Validate input
    if (!subcourseId) {
      console.log('[DEBUG] Subcourse ID missing in request body');
      return apiResponse(res, {
        success: false,
        message: 'Subcourse ID is required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`[DEBUG] Invalid subcourseId format: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400,
      });
    }

    // Check if user has completed the subcourse
    console.log(`[DEBUG] Checking UserCourse for userId: ${userId}, subcourseId: ${subcourseId}`);
    const userCourse = await UserCourse.findOne({ userId, subcourseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] UserCourse not found or subcourse not completed - userId: ${userId}, subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not completed or not enrolled',
        statusCode: 403,
      });
    }

    // Check payment status
    console.log(`[DEBUG] Checking payment status for userId: ${userId}, subcourseId: ${subcourseId}`);
    const certificatePayment = await CertificatePayment.findOne({ userId, subcourseId });
    if (!certificatePayment || !certificatePayment.paymentStatus) {
      console.log(`[DEBUG] Payment not completed for subcourseId: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment required to download certificate',
        statusCode: 403,
      });
    }

    // Fetch template
    console.log('[DEBUG] Fetching certificate template');
    const template = await CertificateTemplate.findOne().sort({ createdAt: -1 });
    if (!template) {
      console.log('[DEBUG] No certificate template found in database');
      return apiResponse(res, {
        success: false,
        message: 'Certificate template not found',
        statusCode: 404,
      });
    }

    // Fetch user
    console.log(`[DEBUG] Fetching user with ID: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Fetch subcourse
    console.log(`[DEBUG] Fetching subcourse with ID: ${subcourseId}`);
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log(`[DEBUG] Subcourse not found for ID: ${subcourseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Generate dynamic fields
    const certificateId = `LS-${uuidv4().split('-')[0].toUpperCase()}`;
    const currentDate = moment().tz('Asia/Kolkata').format('DD/MM/YYYY');
    const certificateDescription = subcourse.certificateDescription || 'This certifies that the above-named individual has completed all required modules, assessments, and project work associated with the subcourse, demonstrating the knowledge and skills necessary in the respective field.';
    console.log('[DEBUG] Dynamic fields generated:', { certificateId, currentDate, certificateDescription });

    // Replace placeholders in the template
    console.log('[DEBUG] Replacing placeholders in HTML template');
    let modifiedHtmlContent = template.content;
    console.log('[DEBUG] Original HTML content length:', modifiedHtmlContent.length);
    modifiedHtmlContent = modifiedHtmlContent
      .replace(/{{username}}/g, user.fullName.toUpperCase())
      .replace(/{{subcourseName}}/g, subcourse.subcourseName)
      .replace(/{{certificateDescription}}/g, certificateDescription)
      .replace(/{{certificateId}}/g, certificateId)
      .replace(/{{currentDate}}/g, currentDate);

    // Generate PDF with Puppeteer
    console.log('[DEBUG] Generating PDF with Puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 595, height: 842 });
    await page.setContent(modifiedHtmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await browser.close();

    // Update isCertificateDownloaded to true
    console.log(`[DEBUG] Updating isCertificateDownloaded for userId: ${userId}, subcourseId: ${subcourseId}`);
    await UserCourse.updateOne(
      { userId, subcourseId, isCompleted: true },
      { $set: { isCertificateDownloaded: true } }
    );

    console.log('[DEBUG] PDF generated successfully, buffer length:', pdfBuffer.length);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificateId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[DEBUG] Error in downloadCertificate:', error);
    return apiResponse(res, {
      success: false,
      message: `Error generating certificate: ${error.message}`,
      statusCode: 500,
    });
  }
};

// Download Main Course Certificate
exports.downloadMainCourseCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.userId;

    console.log(`[DEBUG] Request received - userId: ${userId}, courseId: ${courseId}`);

    // Validate input
    if (!courseId) {
      console.log('[DEBUG] Course ID missing in request');
      return apiResponse(res, {
        success: false,
        message: 'Course ID is required',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`[DEBUG] Invalid courseId format: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400,
      });
    }

    // Check if user has completed the course
    console.log(`[DEBUG] Checking usermainCourse for userId: ${userId}, courseId: ${courseId}`);
    const userCourse = await usermainCourse.findOne({ userId, courseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] usermainCourse not found or course not completed - userId: ${userId}, courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not completed or not enrolled',
        statusCode: 403,
      });
    }

    // Check payment status
    console.log(`[DEBUG] Checking payment status for userId: ${userId}, courseId: ${courseId}`);
    const certificatePayment = await CertificatePayment.findOne({ userId, courseId });
    if (!certificatePayment || !certificatePayment.paymentStatus) {
      console.log(`[DEBUG] Payment not completed for courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Payment required to download certificate',
        statusCode: 403,
      });
    }

    // Fetch template
    console.log('[DEBUG] Fetching certificate template');
    const template = await CertificateTemplate.findOne().sort({ createdAt: -1 });
    if (!template) {
      console.log('[DEBUG] No certificate template found in database');
      return apiResponse(res, {
        success: false,
        message: 'Certificate template not found',
        statusCode: 404,
      });
    }

    // Fetch user
    console.log(`[DEBUG] Fetching user with ID: ${userId}`);
    const user = await User.findById(userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Fetch course
    console.log(`[DEBUG] Fetching course with ID: ${courseId}`);
    const course = await Course.findById(courseId);
    if (!course) {
      console.log(`[DEBUG] Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404,
      });
    }

    // Generate dynamic fields
    const certificateId = `LC-${uuidv4().split('-')[0].toUpperCase()}`;
    const currentDate = moment().tz('Asia/Kolkata').format('DD/MM/YYYY');
    const certificateDescription = course.certificateDescription || 'This certifies that the above-named individual has completed all required modules, assessments, and project work associated with the course, demonstrating the knowledge and skills necessary in the respective field.';
    console.log('[DEBUG] Dynamic fields generated:', { certificateId, currentDate, certificateDescription });

    // Replace placeholders in the template
    console.log('[DEBUG] Replacing placeholders in HTML template');
    let modifiedHtmlContent = template.content;
    console.log('[DEBUG] Original HTML content length:', modifiedHtmlContent.length);
    modifiedHtmlContent = modifiedHtmlContent
      .replace(/{{username}}/g, user.fullName.toUpperCase())
      .replace(/{{subcourseName}}/g, course.courseName)
      .replace(/{{certificateDescription}}/g, certificateDescription)
      .replace(/{{certificateId}}/g, certificateId)
      .replace(/{{currentDate}}/g, currentDate);

    // Generate PDF with Puppeteer
    console.log('[DEBUG] Generating PDF with Puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 595, height: 842 });
    await page.setContent(modifiedHtmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await browser.close();

    // Update isCertificateDownloaded to true
    console.log(`[DEBUG] Updating isCertificateDownloaded for userId: ${userId}, courseId: ${courseId}`);
    await usermainCourse.updateOne(
      { userId, courseId, isCompleted: true },
      { $set: { isCertificateDownloaded: true } }
    );

    console.log('[DEBUG] PDF generated successfully, buffer length:', pdfBuffer.length);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificateId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[DEBUG] Error in downloadMainCourseCertificate:', error);
    return apiResponse(res, {
      success: false,
      message: `Error generating certificate: ${error.message}`,
      statusCode: 500,
    });
  }
};

