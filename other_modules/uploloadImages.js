const {uploadImage} = require("../utils/s3Functions");
const {apiResponse} = require("../utils/apiResponse");

// Express Controller for Image Upload
exports.imageUploadController = async (req, res) => {
  try {
    const file = req.file; // From multer
    const { fileName } = req.body; // From Postman form-data

    if (!file || !fileName) {
      return apiResponse(res, {
        success: false,
        message: "Image file and fileName are required",
        statusCode: 400,
      });
    }

    const fileUrl = await uploadImage(file, fileName);

    return apiResponse(res, {
      success: true,
      message: "Image uploaded successfully to S3",
      data: { fileUrl },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Image Upload Controller Error:", error.message);
    return apiResponse(res, {
      success: false,
      message: `Failed to upload image: ${error.message}`,
      statusCode: 500,
    });
  }
};