const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
  templateName: {
    type: String,
    required: true,
    trim: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  associatedFile: {
    url: String,
    key: String,
    fileType: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);