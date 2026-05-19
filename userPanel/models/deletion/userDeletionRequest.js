const mongoose = require('mongoose');

const userDeletionRequestSchema = new mongoose.Schema(
  {
    confirmationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    email: {
      type: String,
    },
    externalUserId: {
      type: String,
    },
    source: {
      type: String,
      enum: ['meta', 'api', 'manual'],
      default: 'api',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'not_found'],
      default: 'pending',
    },
    message: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserDeletionRequest', userDeletionRequestSchema);
