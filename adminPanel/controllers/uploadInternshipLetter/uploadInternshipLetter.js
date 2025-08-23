const mongoose = require('mongoose');
const InternshipLetter = require('../../../InternshipLetter/models/internshipLetter');
const { apiResponse } = require('../../../utils/apiResponse');
const { uploadImage } = require('../../../utils/s3Functions');
const path = require('path');

// Upload Internship Letter and Update Status
exports.uploadInternshipLetter = async (req, res) => {
  try {
    const { internshipLetterId } = req.body;
    console.log("internshipId",internshipLetterId)
    const file = req.file;

    // Validate internshipLetterId
    if (!mongoose.Types.ObjectId.isValid(internshipLetterId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid internship letter ID',
        statusCode: 400,
      });
    }

    // Find internship letter request
    const internshipLetter = await InternshipLetter.findById(internshipLetterId);
    if (!internshipLetter) {
      return apiResponse(res, {
        success: false,
        message: 'Internship letter request not found',
        statusCode: 404,
      });
    }

    // Check if payment is completed
    if (!internshipLetter.paymentStatus) {
      return apiResponse(res, {
        success: false,
        message: 'Payment must be completed before uploading the internship letter',
        statusCode: 403,
      });
    }

    // Check if file is provided
    if (!file) {
      return apiResponse(res, {
        success: false,
        message: 'No file provided for upload',
        statusCode: 400,
      });
    }

    // Generate unique filename for S3
    const fileExtension = path.extname(file.originalname);
    const fileName = `internship-letters/${internshipLetterId}-${Date.now()}${fileExtension}`;

    // Upload file to S3
    const fileUrl = await uploadImage(file, fileName);

    // Update internship letter with file URL and status
    internshipLetter.internshipLetter = fileUrl;
    internshipLetter.uploadStatus = 'uploaded';
    await internshipLetter.save();

    return apiResponse(res, {
      success: true,
      message: 'Internship letter uploaded and status updated successfully',
      data: internshipLetter.internshipLetter,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error uploading internship letter:', error);
    return apiResponse(res, {
      success: false,
      message: `Failed to upload internship letter: ${error.message}`,
      statusCode: 500,
    });
  }
};

