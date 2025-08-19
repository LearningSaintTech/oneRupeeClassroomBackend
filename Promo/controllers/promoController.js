const mongoose = require('mongoose');
const Promo = require('../models/promo');
const { uploadImage } = require('../../utils/s3Functions');
const { apiResponse } = require('../../utils/apiResponse');

exports.uploadPromo = async (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return apiResponse(res, {
        success: false,
        message: 'No file provided',
        statusCode: 400,
      });
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `promos/${timestamp}_${file.originalname}`;

    // Upload image to S3
    const fileUrl = await uploadImage(file, fileName);

    // Save promo details to database
    const promo = new Promo({
      promo: fileUrl,
    });
    await promo.save();

    return apiResponse(res, {
      success: true,
      message: 'Promo image uploaded successfully',
      data: {
        promoId: promo._id,
        promoUrl: fileUrl,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error uploading promo:', error);
    return apiResponse(res, {
      success: false,
      message: `Error uploading promo: ${error.message}`,
      statusCode: 500,
    });
  }
};

exports.getAllPromos = async (req, res) => {
  try {
    const promos = await Promo.find().sort({ createdAt: -1 }); 

    return apiResponse(res, {
      success: true,
      message: 'Promos retrieved successfully',
      data: promos.map((promo, index) => ({
        promoId: promo._id,
        promoUrl: promo.promo,
      })),
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error fetching promos:', error);
    return apiResponse(res, {
      success: false,
      message: 'Error fetching promos',
      data: null,
      statusCode: 500,
    });
  }
};