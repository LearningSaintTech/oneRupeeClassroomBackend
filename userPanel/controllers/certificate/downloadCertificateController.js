const { createCanvas , Image } = require('canvas');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const User = require('../../models/Auth/Auth'); 
const Subcourse = require('../../../course/models/subcourse'); 
const UserCourse = require('../../models/UserCourse/userCourse'); 
const { apiResponse } = require('../../../utils/apiResponse'); 
const fs = require('fs');
const path = require('path');

// Generate and download certificate with dynamic text
exports.downloadCertificate = async (req, res) => {
  try {
    const userId = req.userId;
    const { subcourseId } = req.body;

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(subcourseId)) {
      return apiResponse(res, {
        success: false,
        message: 'Invalid userId or subcourseId',
        statusCode: 400,
      });
    }

    // Check if user exists
    const user = await User.findById(userId).select('fullName');
    if (!user) {
      return apiResponse(res, {
        success: false,
        message: 'User not found',
        statusCode: 404,
      });
    }

    // Check if subcourse exists
    const subcourse = await Subcourse.findById(subcourseId).select('subcourseName');
    if (!subcourse) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not found',
        statusCode: 404,
      });
    }

    // Verify subcourse completion
    const userCourse = await UserCourse.findOne({ userId, subcourseId }).select('isCompleted');
    if (!userCourse || !userCourse.isCompleted) {
      return apiResponse(res, {
        success: false,
        message: 'Subcourse not completed',
        statusCode: 403,
      });
    }

    // Generate unique certificate ID
    const certificateId = uuidv4();

    // Set completion date (02:09 PM IST, August 16, 2025)
    const completionDate = new Date('2025-08-16T14:09:00+05:30').toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '/'); // Format as DD/MM/YYYY

    // Load the template image
    const templatePath = path.resolve('public/certificate-template.jpeg');
    console.log("44",templatePath)
    if (!fs.existsSync(templatePath)) {
      return apiResponse(res, {
        success: false,
        message: 'Certificate template image not found',
        statusCode: 500,
      });
    }

    // Create canvas with the same dimensions as the template
    const img = new Image();
    img.src = fs.readFileSync(templatePath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    // Draw the template image
    ctx.drawImage(img, 0, 0);

    // Set text properties
    ctx.fillStyle = 'black';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';

    // Define text positions (adjust these coordinates based on your template)
    const textPositions = {
      name: { x: canvas.width / 2, y: canvas.height / 2 - 100 },
      courseDesc: { x: canvas.width / 2, y: canvas.height / 2 - 50 },
      certificateId: { x: canvas.width / 2, y: canvas.height / 2 + 50 },
      completionDate: { x: canvas.width / 2, y: canvas.height / 2 + 100 },
    };

    // Add dynamic text to the canvas
    ctx.fillText(user.fullName, textPositions.name.x, textPositions.name.y);
    ctx.fillText(`Course: ${subcourse.subcourseName}`, textPositions.courseDesc.x, textPositions.courseDesc.y);
    ctx.fillText(`Certificate ID: ${certificateId}`, textPositions.certificateId.x, textPositions.certificateId.y);
    ctx.fillText(`Completed on: ${completionDate}`, textPositions.completionDate.x, textPositions.completionDate.y);

    // Convert canvas to PNG buffer
    const pngBuffer = canvas.toBuffer('image/png');

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename=certificate_${subcourseId}_${userId}.png`);
    res.setHeader('Content-Type', 'image/png');

    // Send the PNG buffer as response
    res.send(pngBuffer);

  } catch (error) {
    return apiResponse(res, {
      success: false,
      message: `Failed to download certificate: ${error.message}`,
      statusCode: 500,
    });
  }
};