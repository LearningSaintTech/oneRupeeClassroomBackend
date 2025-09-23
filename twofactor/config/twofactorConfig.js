const axios = require('axios');

// 2Factor configuration
const twofactorConfig = {
  apiKey: process.env.TWOFACTOR_API_KEY,
  baseUrl: process.env.TWOFACTOR_BASE_URL,
  templateName: process.env.TWOFACTOR_OTP_TEMPLATE_NAME,
};

// Create axios instance for 2Factor API
const twofactorClient = axios.create({
  baseURL: twofactorConfig.baseUrl,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  }
});

module.exports = {
  twofactorClient,
  twofactorConfig
};
