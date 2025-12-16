const express = require('express');
const router = express.Router();
const {getPurchasedMainCourseUsers,exportUsersToCsv ,searchUsers,getUsersNoSubcoursePurchase} = require('../controllers/Users/usersController');
const { verifyAdmin } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-users', verifyAdmin, getPurchasedMainCourseUsers);
router.get('/get-usersToCsv', verifyAdmin, exportUsersToCsv);
router.get('/search-user', verifyAdmin, searchUsers);
router.get('/get-usersNoSubcoursePurchase', verifyAdmin, getUsersNoSubcoursePurchase);


module.exports = router;