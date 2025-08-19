const mongoose = require('mongoose');
const CertificateTemplate = require("../../../adminPanel/models/Templates/certificateTemplate");
const User = mongoose.model('User');
const UserCourse = require("../../models/UserCourse/userCourse");
const { apiResponse } = require('../../../utils/apiResponse');
const { v4: uuidv4 } = require('uuid'); 
const moment = require('moment-timezone'); 
const pdf = require('html-pdf');


exports.downloadCertificate = async (req, res) => {
  try {
    const { subcourseId } = req.body;
    console.log(req.userId);

    if (!subcourseId) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse ID is required',
        statusCode: 400
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid subcourse ID',
        statusCode: 400
      });
    }

    const userCourse = await UserCourse.findOne({ userId: req.userId, subcourseId, isCompleted: true });
    if (!userCourse) {
      return apiResponse(res, {
        success: false,
        message: 'Course not completed or not enrolled',
        statusCode: 403
      });
    }

    const template = await CertificateTemplate.findOne();
    if (!template) {
      return apiResponse(res, {
        success: false,
        message: 'Certificate template not found',
        statusCode: 404
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    const currentDate = moment().tz('Asia/Kolkata').format('DD/MM/YYYY HH:mm:ss'); // 18/08/2025 15:05:00
    const certificateId = `LS-${uuidv4().split('-')[0].toUpperCase()}`;

    let modifiedHtmlContent = template.htmlContent;
    console.log('Original HTML:', modifiedHtmlContent); // Debug log
    console.log('User Full Name:', user.fullName); // Debug log
    modifiedHtmlContent = modifiedHtmlContent.replace(/{{username}}/g, user.fullName);
    modifiedHtmlContent = modifiedHtmlContent.replace(/{{courseName}}/g, 'Data Science Certification Program');
    modifiedHtmlContent = modifiedHtmlContent.replace(/{{completionDate}}/g, currentDate);
    modifiedHtmlContent = modifiedHtmlContent.replace(/{{certificateId}}/g, certificateId);
    modifiedHtmlContent = modifiedHtmlContent.replace(/{{associatedFile}}/g, template.associatedFile?.url || '');
    console.log('Modified HTML:', modifiedHtmlContent); // Debug log

    const pdfOptions = { format: 'A4', type: 'pdf' };
    pdf.create(modifiedHtmlContent, pdfOptions).toBuffer((err, buffer) => {
      if (err) {
        return apiResponse(res, {
          success: false,
          message: 'Error generating PDF: ' + err.message,
          statusCode: 500
        });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate_${certificateId}.pdf"`);
      res.send(buffer);
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error generating certificate: ' + error.message,
      statusCode: 500
    });
  }
};