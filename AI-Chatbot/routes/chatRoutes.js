const express = require("express")
const  {chatBot} = require("../controller/chatController")
const router = express.Router();
const {verifyToken} = require("../../middlewares/authMiddleware")


router.post('/chat',verifyToken,chatBot)


 module.exports = router