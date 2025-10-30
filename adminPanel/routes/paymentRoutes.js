const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const { getCompletedPayments } = require('../controllers/payment/paymentController');

// GET /api/admin/payments
router.get('/', verifyToken, getCompletedPayments);

module.exports = router;


