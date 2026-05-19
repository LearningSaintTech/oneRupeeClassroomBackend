const express = require('express');
const {
  handleUserDeletionCallback,
  getUserDeletionStatus,
} = require('../controllers/deletion/userDeletionCallbackController');

const router = express.Router();

// Data deletion callback (Meta / platform compliance)
router.post('/callback', handleUserDeletionCallback);

// Status URL referenced in callback response
router.get('/status/:confirmationCode', getUserDeletionStatus);

module.exports = router;
