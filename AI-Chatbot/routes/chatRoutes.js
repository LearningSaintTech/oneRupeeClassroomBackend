const express = require("express")
const  {chatBot,readAloud} = require("../controller/chatController")
const router = express.Router();
const {verifyToken} = require("../../middlewares/authMiddleware")


router.post('/chat',verifyToken,chatBot)
router.post('/speak',verifyToken,readAloud)

 module.exports = router