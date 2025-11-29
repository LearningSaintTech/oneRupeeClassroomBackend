const express = require("express")
const  {chatBot,readAloud} = require("../controller/chatController")
const router = express.Router();
const {verifyToken} = require("../../middlewares/authMiddleware")


router.post('/chat',chatBot)
router.post('/speak',readAloud)

 module.exports = router