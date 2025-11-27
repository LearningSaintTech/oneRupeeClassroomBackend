const mongoose = require('mongoose');
const Activity = require('../../models/Activites/activity');
const { apiResponse } = require('../../../utils/apiResponse');
const { uploadImage, deleteFromS3 } = require('../../../utils/s3Functions'); // your S3 file
const path = require('path');

// Helper: Generate unique filename
const generateFileName = (originalName) => {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `activities/${timestamp}-${random}${ext}`;
};

// CREATE Activity with Image Upload
exports.createActivity = async (req, res) => {
  try {
    const { activityTitle, activityHeading, activityDescription, activityLink } = req.body;
    const file = req.file; // from multer

    if (!activityTitle || !activityHeading || !activityDescription || !activityLink) {
      return apiResponse(res, {
        success: false,
        message: "All text fields are required",
        statusCode: 400
      });
    }

    if (!file) {
      return apiResponse(res, {
        success: false,
        message: "Activity image is required",
        statusCode: 400
      });
    }

    // Upload image to S3
    const fileName = generateFileName(file.originalname);
    const activityImage = await uploadImage(file, fileName);

    const newActivity = new Activity({
      activityTitle,
      activityHeading,
      activityDescription,
      activityLink,
      activityImage
    });

    const savedActivity = await newActivity.save();

    return apiResponse(res, {
      success: true,
      message: "Activity created successfully",
      data: savedActivity,
      statusCode: 201
    });

  } catch (error) {
    console.error("Create Activity Error:", error);
    return apiResponse(res, {
      success: false,
      message: error.message || "Failed to create activity",
      statusCode: 500
    });
  }
};

// UPDATE Activity (with optional image update)
exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const file = req.file;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse(res, { success: false, message: "Invalid Activity ID", statusCode: 400 });
    }

    const activity = await Activity.findById(id);
    if (!activity) {
      return apiResponse(res, { success: false, message: "Activity not found", statusCode: 404 });
    }

    let activityImage = activity.activityImage;

    // If new image is uploaded
    if (file) {
      // Delete old image from S3
      if (activityImage) {
        await deleteFromS3(activityImage).catch(console.warn); // optional: ignore if already deleted
      }
      const fileName = generateFileName(file.originalname);
      activityImage = await uploadImage(file, fileName);
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        activity[key] = updates[key];
      }
    });

    if (activityImage) activity.activityImage = activityImage;

    const updatedActivity = await activity.save();

    return apiResponse(res, {
      success: true,
      message: "Activity updated successfully",
      data: updatedActivity,
      statusCode: 200
    });

  } catch (error) {
    console.error("Update Activity Error:", error);
    return apiResponse(res, {
      success: false,
      message: error.message || "Failed to update activity",
      statusCode: 500
    });
  }
};

// GET All Activities
exports.getAllActivities = async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 });
    return apiResponse(res, {
      success: true,
      message: "Activities fetched successfully",
      data: activities,
      statusCode: 200
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message || "Server error",
      statusCode: 500
    });
  }
};

// GET Single Activity by ID
exports.getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse(res, { success: false, message: "Invalid ID", statusCode: 400 });
    }

       const activity = await Activity.findById(id);
    if (!activity) {
      return apiResponse(res, { success: false, message: "Activity not found", statusCode: 404 });
    }

    return apiResponse(res, {
      success: true,
      message: "Activity fetched successfully",
      data: activity,
      statusCode: 200
    });
  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: error.message || "Server error",
      statusCode: 500
    });
  }
};

// DELETE Activity + Delete Image from S3
exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse(res, { success: false, message: "Invalid Activity ID", statusCode: 400 });
    }

    const activity = await Activity.findByIdAndDelete(id);
    if (!activity) {
      return apiResponse(res, { success: false, message: "Activity not found", statusCode: 404 });
    }

    // Delete image from S3
    if (activity.activityImage) {
      await deleteFromS3(activity.activityImage).catch(err => {
        console.warn("S3 delete failed (image may be missing):", err.message);
      });
    }

    return apiResponse(res, {
      success: true,
      message: "Activity and image deleted successfully",
      data: activity,
      statusCode: 200
    });

  } catch (error) {
    console.error("Delete Activity Error:", error);
    return apiResponse(res, {
      success: false,
      message: error.message || "Failed to delete activity",
      statusCode: 500
    });
  }
};