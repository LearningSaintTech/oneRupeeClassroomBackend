const mongoose = require('mongoose');
const Activity = require('../../../adminPanel/models/Activites/activity');
const { apiResponse } = require('../../../utils/apiResponse');



exports.getAllActivityImages = async (req, res) => {
  try {
    // Only fetch the activityImage field + _id
    const activities = await Activity.find({})
      .select('activityImage _id')
      .sort({ createdAt: -1 })
      .lean();

    const imageUrls = activities
      .filter(act => act.activityImage) 
      .map(act => ({
        id: act._id,
        imageUrl: act.activityImage
      }));

    return apiResponse(res, {
      success: true,
      message: "Activity images fetched successfully",
      data: imageUrls,
      statusCode: 200
    });

  } catch (error) {
    console.error("Get All Activity Images Error:", error);
    return apiResponse(res, {
      success: false,
      message: "Failed to fetch activity images",
      statusCode: 500
    });
  }
};


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