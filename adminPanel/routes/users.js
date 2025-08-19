const express = require('express');
const router = express.Router();
const {getPurchasedMainCourseUsers,exportUsersToCsv ,searchUsers} = require('../controllers/Users/users');
const { verifyToken } = require('../../middlewares/authMiddleware');





// Routes
router.get('/get-users', verifyToken, getPurchasedMainCourseUsers);
router.get('/get-usersToCsv', verifyToken, exportUsersToCsv);
router.get('/search-user', verifyToken, searchUsers);

module.exports = router;