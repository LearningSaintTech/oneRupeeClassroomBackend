const express = require('express');
const router = express.Router();
const {searchSubcourses} = require('../controllers/search/searchController');
const {verifyToken} = require('../../middlewares/authMiddleware'); 

router.get('/search-subcourse', verifyToken, searchSubcourses);

module.exports = router;