const buildAuthOtpTemplate = ({ otp, purpose = 'authentication' }) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OTP Verification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
      }
      .header {
        background: #1f6feb;
        color: #ffffff;
        padding: 16px;
        text-align: center;
      }
      .content {
        padding: 24px;
        text-align: center;
      }
      .otp {
        font-size: 28px;
        letter-spacing: 3px;
        font-weight: 700;
        margin: 16px 0;
      }
      .note {
        color: #666666;
        font-size: 14px;
      }
      .footer {
        padding: 12px;
        text-align: center;
        font-size: 12px;
        color: #888888;
        border-top: 1px solid #eeeeee;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Email OTP Verification</h2>
      </div>
      <div class="content">
        <p>Your OTP for <strong>${purpose}</strong> is:</p>
        <div class="otp">${otp}</div>
        <p>This OTP is valid for <strong>5 minutes</strong>.</p>
        <p class="note">If you did not request this, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} Learning Saint
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = { buildAuthOtpTemplate };

