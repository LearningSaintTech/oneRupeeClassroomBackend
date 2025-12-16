const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../../middlewares/authMiddleware');
const { getCompletedPayments } = require('../controllers/payment/paymentController');

// GET /api/admin/payments
router.get('/', verifyAdmin, getCompletedPayments);

module.exports = router;


