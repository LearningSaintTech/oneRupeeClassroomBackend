const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth');
const Subcourse = require('../../../course/models/subcourse');
const Template = require('../../../adminPanel/models/Templates/certificateTemplate');
const UserCourse = require("../../models/UserCourse/userCourse")
const CertificateTemplate = require("../../../adminPanel/models/Templates/certificateTemplate")
const { apiResponse } = require('../../../utils/apiResponse');
const usermainCourse = require("../../models/UserCourse/usermainCourse");
const Course = require("../../../course/models/course");
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const pdf = require('html-pdf');
const crypto = require('crypto');



// Controller for downloading certificate
exports.downloadCertificate = async (req, res) => {
  try {
    console.log("1111")
    const { subcourseId } = req.params;
    console.log(`[DEBUG] Request received - userId: ${req.userId}, subcourseId: ${subcourseId}`); // Debug log

    // Validate input
    console.log('[DEBUG] Validating subcourseId'); // Debug log
    if (!subcourseId) {
      console.log('[DEBUG] Subcourse ID missing in request body'); // Debug log
      return apiResponse(res, {
        success: false,
        message: 'Subcourse ID is required',
        statusCode: 400
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      console.log(`[DEBUG] Invalid subcourseId format: ${subcourseId}`); // Debug log
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400
      });
    }

    // Check if user has completed the course
    console.log(`[DEBUG] Checking UserCourse for userId: ${req.userId}, subcourseId: ${subcourseId}`); // Debug log
    const userCourse = await UserCourse.findOne({ userId: req.userId, subcourseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] UserCourse not found or course not completed - userId: ${req.userId}, subcourseId: ${subcourseId}`); // Debug log
      return apiResponse(res, {
        success: false,
        message: 'Course not completed or not enrolled',
        statusCode: 403
      });
    }
    console.log('[DEBUG] UserCourse found:', userCourse); // Debug log

    // Fetch template
    console.log('[DEBUG] Fetching certificate template'); // Debug log
    const template = await CertificateTemplate.findOne().sort({ createdAt: -1 }); // Get latest template
    if (!template) {
      console.log('[DEBUG] No certificate template found in database'); // Debug log
      return apiResponse(res, {
        success: false,
        message: 'Certificate template not found',
        statusCode: 404
      });
    }
    console.log('[DEBUG] Template fetched - ID:', template._id); // Debug log

    // Fetch user
    console.log(`[DEBUG] Fetching user with ID: ${req.userId}`); // Debug log
    const user = await User.findById(req.userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${req.userId}`); // Debug log
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }
    console.log('[DEBUG] User fetched:', user.fullName); // Debug log

    // Fetch subcourse
    console.log(`[DEBUG] Fetching subcourse with ID: ${subcourseId}`); // Debug log
    const subcourse = await Subcourse.findById(subcourseId);
    if (!subcourse) {
      console.log(`[DEBUG] Subcourse not found for ID: ${subcourseId}`); // Debug log
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404
      });
    }
    console.log('[DEBUG] Subcourse fetched:', subcourse.subcourseName); // Debug log

    // Generate dynamic fields
    const certificateId = `LS-${uuidv4().split('-')[0].toUpperCase()}`; // Random 8-char UUID
    const currentDate = moment().tz('Asia/Kolkata').format('DD/MM/YYYY'); // e.g., 21/08/2025 11:45:00
    const certificateDescription = subcourse.certificateDescription || 'This certifies that the above-named individual has completed all required modules, assessments, and project work associated with the course, demonstrating the knowledge and skills necessary in the respective field.';
    console.log('[DEBUG] Dynamic fields generated:', { certificateId, currentDate, certificateDescription }); // Debug log

    // Replace placeholders in the template
    console.log('[DEBUG] Replacing placeholders in HTML template'); // Debug log
    let modifiedHtmlContent = template.content;
    console.log('[DEBUG] Original HTML content length:', modifiedHtmlContent.length); // Debug log
    modifiedHtmlContent = modifiedHtmlContent
      .replace(/{{username}}/g, user.fullName.toUpperCase())
      .replace(/{{subcourseName}}/g, subcourse.subcourseName)
      .replace(/{{certificateDescription}}/g, certificateDescription)
      .replace(/{{certificateId}}/g, certificateId)
      .replace(/{{currentDate}}/g, currentDate);
    console.log('[DEBUG] Modified HTML content length:', modifiedHtmlContent.length); // Debug log

    // Generate PDF with Puppeteer
    console.log('[DEBUG] Generating PDF with Puppeteer'); // Debug log
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 595, height: 842 }); // A4 in pixels (approx. 210mm x 297mm)
    await page.setContent(modifiedHtmlContent, { waitUntil: 'networkidle0' }); // Wait for all network requests (images, etc.)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await browser.close();

    console.log('[DEBUG] PDF generated successfully, buffer length:', pdfBuffer.length); // Debug log
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificateId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[DEBUG] Error in downloadCertificate:', error); // Debug log
    return apiResponse(res, {
      success: false,
      message: `Error generating certificate: ${error.message}`,
      statusCode: 500
    });
  }
};



//download maincourse Certificate

exports.downloadMainCourseCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(`[DEBUG] Request received - userId: ${req.userId}, courseId: ${courseId}`);

    // Validate input
    console.log('[DEBUG] Validating courseId');
    if (!courseId) {
      console.log('[DEBUG] Course ID missing in request');
      return apiResponse(res, {
        success: false,
        message: 'Course ID is required',
        statusCode: 400
      });
    }

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.log(`[DEBUG] Invalid courseId format: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Invalid course ID',
        statusCode: 400
      });
    }

    // Check if user has completed the course
    console.log(`[DEBUG] Checking usermainCourse for userId: ${req.userId}, courseId: ${courseId}`);
    const userCourse = await usermainCourse.findOne({ userId: req.userId, courseId, isCompleted: true });
    if (!userCourse) {
      console.log(`[DEBUG] usermainCourse not found or course not completed - userId: ${req.userId}, courseId: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not completed or not enrolled',
        statusCode: 403
      });
    }
    console.log('[DEBUG] usermainCourse found:', userCourse);

    // Fetch template
    console.log('[DEBUG] Fetching certificate template');
    const template = await CertificateTemplate.findOne().sort({ createdAt: -1 }); // Get latest template
    if (!template) {
      console.log('[DEBUG] No certificate template found in database');
      return apiResponse(res, {
        success: false,
        message: 'Certificate template not found',
        statusCode: 404
      });
    }
    console.log('[DEBUG] Template fetched - ID:', template._id);

    // Fetch user
    console.log(`[DEBUG] Fetching user with ID: ${req.userId}`);
    const user = await User.findById(req.userId);
    if (!user) {
      console.log(`[DEBUG] User not found for ID: ${req.userId}`);
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }
    console.log('[DEBUG] User fetched:', user.fullName);

    // Fetch course
    console.log(`[DEBUG] Fetching course with ID: ${courseId}`);
    const course = await Course.findById(courseId);
    if (!course) {
      console.log(`[DEBUG] Course not found for ID: ${courseId}`);
      return apiResponse(res, {
        success: false,
        message: 'Course not found',
        statusCode: 404
      });
    }
    console.log('[DEBUG] Course fetched:', course.courseName);

    // Generate dynamic fields
    const certificateId = `LC-${uuidv4().split('-')[0].toUpperCase()}`; // Random 8-char UUID with LC prefix
    const currentDate = moment().tz('Asia/Kolkata').format('DD/MM/YYYY'); // e.g., 21/08/2025 11:45:00
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
    console.log('[DEBUG] Modified HTML content length:', modifiedHtmlContent.length);

    // Generate PDF with Puppeteer
    console.log('[DEBUG] Generating PDF with Puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 595, height: 842 }); // A4 in pixels (approx. 210mm x 297mm)
    await page.setContent(modifiedHtmlContent, { waitUntil: 'networkidle0' }); // Wait for all network requests (images, etc.)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    await browser.close();

    console.log('[DEBUG] PDF generated successfully, buffer length:', pdfBuffer.length);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificateId}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[DEBUG] Error in downloadMainCourseCertificate:', error);
    return apiResponse(res, {
      success: false,
      message: `Error generating certificate: ${error.message}`,
      statusCode: 500
    });
  }
};