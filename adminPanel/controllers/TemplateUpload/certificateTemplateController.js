// controllers/templateController.js
const Template = require('../../models/Templates/certificateTemplate');
const { apiResponse } = require('../../../utils/apiResponse');

exports.uploadTemplate = async (req, res) => {
  console.log("11111");
  try {
    const { content } = req.body;

    if (!content) {
      return apiResponse(res, {
        success: false,
        message: 'Template content is required',
        statusCode: 400,
      });
    }

    const template = new Template({ content });
    await template.save();

    return apiResponse(res, {
      success: true,
      message: 'Template uploaded successfully',
      data: { id: template._id },
      statusCode: 201,
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: 'Error uploading template',
      data: { error: error.message },
      statusCode: 500,
    });
  }
};