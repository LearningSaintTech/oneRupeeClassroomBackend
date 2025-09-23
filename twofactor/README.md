# 2Factor Authentication Integration

This module provides 2Factor authentication services for the One Rupee Classroom backend application.

## 📁 File Structure

```
twofactor/
├── config/
│   └── twofactorConfig.js      # 2Factor API configuration
├── services/
│   └── twofactorService.js     # 2Factor API service layer
├── controllers/
│   └── twofactorAuthController.js # Authentication controllers
├── routes/
│   └── twofactorRoutes.js      # API routes
└── README.md                   # This file
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# 2Factor Configuration
TWOFACTOR_API_KEY=eb88dba4-3643-11f0-8b17-0200cd936042
TWOFACTOR_OTP_TEMPLATE_NAME=OTPtemplate
TWOFACTOR_BASE_URL=https://2factor.in
```

### Dependencies

- `axios`: For making HTTP requests to 2Factor API
- `jsonwebtoken`: For JWT token generation
- `dotenv`: For environment variable management

## 🚀 API Endpoints

### Base URL: `/api/2factor`

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/status` | Check 2Factor service status | None |
| POST | `/register` | Register new user | `{ fullName, mobileNumber }` |
| POST | `/login` | Login existing user | `{ mobileNumber }` |
| POST | `/verify-otp` | Verify OTP | `{ mobileNumber, otp, sessionId }` |
| POST | `/resend-otp` | Resend OTP | `{ mobileNumber }` |

## 📝 Request/Response Examples

### 1. Register User

**Request:**
```json
POST /api/2factor/register
{
  "fullName": "John Doe",
  "mobileNumber": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered and OTP sent successfully",
  "data": {
    "sessionId": "abc123def456",
    "phoneNumber": "+919876543210",
    "userId": "64f8a1b2c3d4e5f6a7b8c9d0"
  }
}
```

### 2. Login User

**Request:**
```json
POST /api/2factor/login
{
  "mobileNumber": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "sessionId": "abc123def456",
    "phoneNumber": "+919876543210"
  }
}
```

### 3. Verify OTP

**Request:**
```json
POST /api/2factor/verify-otp
{
  "mobileNumber": "+919876543210",
  "otp": "123456",
  "sessionId": "abc123def456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "fullName": "John Doe",
      "mobileNumber": "+919876543210",
      "isVerified": true
    }
  }
}
```

### 4. Resend OTP

**Request:**
```json
POST /api/2factor/resend-otp
{
  "mobileNumber": "+919876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP resent successfully",
  "data": {
    "sessionId": "abc123def456",
    "phoneNumber": "+919876543210"
  }
}
```

## ✅ Validation Rules

### Mobile Number
- Must start with `+91`
- Followed by exactly 10 digits
- Example: `+919876543210`

### Full Name
- 2-50 characters long
- Only letters and spaces allowed
- Example: `John Doe`, `Mary Jane Smith`

### OTP
- Exactly 6 digits
- Example: `123456`

### Session ID
- String type
- Minimum 10 characters
- Provided by 2Factor API

## 🔍 Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "data": {
    "error": "Additional error details"
  }
}
```

### Common Error Codes

- `400`: Bad Request (validation errors, missing fields)
- `404`: Not Found (user not found)
- `500`: Internal Server Error (server issues, 2Factor API errors)

## 🧪 Testing

### Using Postman

1. Import the `2Factor_Postman_Collection.json` file
2. Set the `baseUrl` variable to your server URL (default: `http://localhost:3000`)
3. Run the requests in order:
   - Health Check
   - 2Factor Service Status
   - Register User
   - Verify OTP (use sessionId from register response)

### Using cURL

```bash
# Health check
curl -X GET http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/2factor/register \
  -H "Content-Type: application/json" \
  -d '{"fullName": "John Doe", "mobileNumber": "+919876543210"}'

# Verify OTP
curl -X POST http://localhost:3000/api/2factor/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "+919876543210", "otp": "123456", "sessionId": "your-session-id"}'
```

## 🔐 Security Features

1. **Input Validation**: All inputs are validated before processing
2. **JWT Tokens**: Secure token-based authentication
3. **Session Management**: 2Factor session IDs for OTP verification
4. **Error Handling**: Comprehensive error handling and logging
5. **Rate Limiting**: Handled by 2Factor service

## 📊 Logging

All operations are logged with appropriate prefixes:
- `🔐 [2FACTOR AUTH]` - Authentication operations
- `📝 [2FACTOR AUTH]` - Registration operations
- `✅ [2FACTOR AUTH]` - Verification operations
- `🔄 [2FACTOR AUTH]` - Resend operations
- `🔍 [2FACTOR AUTH]` - Status checks
- `❌ [2FACTOR AUTH]` - Error operations

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install axios
   ```

2. Add environment variables to `.env`

3. Start the server:
   ```bash
   npm start
   ```

4. Test the endpoints using Postman or cURL

## 📞 Support

For issues related to 2Factor service, check:
- 2Factor API documentation
- Server logs for detailed error messages
- Network connectivity to 2Factor servers

## 🔄 Integration Notes

- This module works alongside existing Firebase authentication
- Uses the same User model as Firebase auth
- JWT tokens are compatible with existing auth middleware
- All responses use the standard `apiResponse` utility
