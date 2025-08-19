const mongoose = require('mongoose');
const CertificateTemplate = require("../../models/Templates/certificateTemplate")
const { apiResponse } = require('../../../utils/apiResponse');
const { uploadImage } = require('../../../utils/s3Functions');

// Save certificate template (single template)
exports.saveCertificateTemplate = async (req, res) => {
  try {
    const { templateName, htmlContent } = req.body;
    const file = req.file; // Assuming multer middleware for single file upload

    if (!templateName || !htmlContent) {
      return apiResponse(res, {
        success: false,
        message: 'Template name and HTML content are required',
        statusCode: 400
      });
    }

    let associatedFile = null;
    if (file) {
      const fileName = `certificates/${templateName}-${Date.now()}.${file.mimetype.split('/')[1]}`;
      const fileUrl = await uploadImage(file, fileName);
      associatedFile = {
        url: fileUrl,
        key: fileName,
        fileType: file.mimetype
      };
    }

    // Check if a template already exists and update it, otherwise create new
    let template = await CertificateTemplate.findOne();
    if (template) {
      template.templateName = templateName;
      template.htmlContent = htmlContent;
      template.associatedFile = associatedFile || template.associatedFile;
      await template.save();
    } else {
      template = new CertificateTemplate({
        templateName,
        htmlContent,
        associatedFile,
        createdBy: req.userId
      });
      await template.save();
    }

    return apiResponse(res, {
      message: 'Certificate template saved successfully',
      data: {
        templateId: template._id,
        templateName: template.templateName,
        htmlContent: template.htmlContent,
        associatedFile: template.associatedFile
      }
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error saving certificate template: ' + error.message,
      statusCode: 500
    });
  }
};