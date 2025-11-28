const axios = require("axios");
const { apiResponse } = require("../../utils/apiResponse");
require("dotenv").config();

const {
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL
} = process.env;

const SYSTEM_PROMPT = `Hey! You are saint, a friendly, smart, and engaging learning assistant for the LearningSaint edtech app.

Greeting:

Only for the first interaction, start with:
“Hey! I’m saint, full of gyaan and peace! What do you want to learn today?”

Do not repeat this greeting later.

Personality:

Energetic, encouraging, and student-friendly

Warm, approachable, and easy to understand

Makes learning enjoyable with clear explanations and relatable examples

Interaction Style:

Answer questions like a friendly tutor

Keep answers concise, 4–5 lines max

Use real-world examples when possible

Encourage curiosity and deeper learning

If the question is unclear, politely ask for clarification

Adapt explanations to the student’s level

Rules:

Avoid overly technical jargon unless required

Keep the conversation motivating, positive, and fun

Special Case: If the user asks about “LearningSaint” or “this app,” respond:
“LearningSaint is an edtech app ofafering a variety of courses, like digital marketing, programming, and other skill-building courses to help you learn and grow.”`;

exports.chatBot = async (req, res) => {
    console.log("\n=== Gyan-O-Bot Request Started ===");
    console.log("User ID (if available in session):", req.sessionID);
    console.log("Incoming message:", req.body.message);

    try {
        const { message } = req.body;

        // Input validation
        if (!message || message.trim() === "") {
            console.warn("Empty or missing message from user");
            return apiResponse(res, {
                success: false,
                message: "Message is required",
                statusCode: 400
            });
        }

        // Initialize session chat history if not exists
        if (!req.session.gyanobot) {
            req.session.gyanobot = {
                messages: [{ role: "system", content: SYSTEM_PROMPT }]
            };
            console.log("New session created for Gyan-O-Bot");
        }

        const chat = req.session.gyanobot;

        // Log current message count before adding user message
        console.log(`Previous messages in history: ${chat.messages.length - 1} (excluding system)`);

        // Add user message
        chat.messages.push({ role: "user", content: message.trim() });
        console.log("User message added to history");

        // Debug: Show full payload being sent to OpenRouter
        const payload = {
            model: OPENROUTER_MODEL,
            messages: chat.messages,
            temperature: 0.5,
            max_tokens: 1024
        };

        console.log("Sending request to OpenRouter API...");
        console.log("Model:", OPENROUTER_MODEL);
        console.log("Total messages sent:", payload.messages.length);

        // Call OpenRouter API
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            // "https://openrouter.ai/api/v1/chat/completions",
            payload,
            {
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    "Referer": "https://learningsaint.com", // Optional: helps with rate limits
                    "X-Title": "Gyan-O-Bot"
                },
                timeout: 30000 // 30 second timeout
            }
        );

        const botReply = response.data.choices[0]?.message?.content?.trim();

        if (!botReply) {
            console.error("No reply received from model:", response.data);
            return apiResponse(res, {
                success: false,
                message: "Bot did not return a response",
                statusCode: 500
            });
        }

        // Save assistant reply to session
        chat.messages.push({ role: "assistant", content: botReply });
        console.log("Bot reply saved to session");
        console.log(`Bot reply (first 100 chars): ${botReply.substring(0, 100)}...`);

        console.log("=== Gyan-O-Bot Request Successful ===\n");

        return apiResponse(res, {
            success: true,
            message: "Gyan-O-Bot replied!",
            data: { reply: botReply },
            statusCode: 200
        });

    } catch (error) {
        console.error("=== Gyan-O-Bot ERROR ===");

        if (error.response) {
            // API responded with error status
            console.error("Status:", error.response.status);
            console.error("Error data:", error.response.data);
        } else if (error.request) {
            // Request made but no response
            console.error("No response received:", error.message);
        } else {
            // Something else happened
            console.error("Request setup error:", error.message);
        }

        console.error("Full error:", error);
        console.error("===================\n");

        return apiResponse(res, {
            success: false,
            message: "Something went wrong with Gyan-O-Bot",
            statusCode: 500
        });
    }
};