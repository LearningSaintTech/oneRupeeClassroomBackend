const twofactorService = require('../services/twofactorService');
const jwt = require('jsonwebtoken');
const User = require('../../userPanel/models/Auth/Auth');
const { apiResponse } = require('../../utils/apiResponse');

// Hardcoded phone number and OTP for bypassing 2FA
const HARDCODED_PHONE = '+911234567890';
const HARDCODED_OTP = '123456';

// Validate mobile number format (+91 followed by 10 digits)
const validateMobile = (mobileNumber) => {
  if (!mobileNumber || typeof mobileNumber !== 'string') {
    return { isValid: false, error: 'Mobile number is required and must be a string' };
  }
  
  const trimmed = mobileNumber.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Mobile number cannot be empty' };
  }
  
  if (!/^\+91\d{10}$/.test(trimmed)) {
    return { isValid: false, error: 'Mobile number must start with +91 and be followed by exactly 10 digits' };
  }
  
  return { isValid: true, normalized: trimmed };
};

// Validate OTP format (6 digits)
const validateOTP = (otp) => {
  if (!otp || typeof otp !== 'string') {
    return { isValid: false, error: 'OTP is required and must be a string' };
  }
  
  const trimmed = otp.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'OTP cannot be empty' };
  }
  
  if (!/^\d{6}$/.test(trimmed)) {
    return { isValid: false, error: 'OTP must be exactly 6 digits' };
  }
  
  return { isValid: true, normalized: trimmed };
};

// Validate full name (minimum 2 characters, only letters and spaces)
const validateFullName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return { isValid: false, error: 'Full name is required and must be a string' };
  }
  
  const trimmed = fullName.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Full name cannot be empty' };
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters long' };
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Full name must not exceed 50 characters' };
  }
  
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
    return { isValid: false, error: 'Full name can only contain letters and spaces' };
  }
  
  if (/\s{2,}/.test(trimmed)) {
    return { isValid: false, error: 'Full name cannot contain multiple consecutive spaces' };
  }
  
  return { isValid: true, normalized: trimmed };
};

// Validate session ID format
const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') {
    return { isValid: false, error: 'Session ID is required and must be a string' };
  }
  
  const trimmed = sessionId.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Session ID cannot be empty' };
  }
  
  if (trimmed.length < 10) {
    return { isValid: false, error: 'Session ID must be at least 10 characters long' };
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Session ID must not exceed 100 characters' };
  }
  
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
    return { isValid: false, error: 'Session ID contains invalid characters' };
  }
  
  return { isValid: true, normalized: trimmed };
};

// Validate request body structure
const validateRequestBody = (body, requiredFields) => {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object' };
  }
  
  const missingFields = requiredFields.filter(field => !(field in body));
  if (missingFields.length > 0) {
    return { isValid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
  }
  
  return { isValid: true };
};

// Login with 2Factor
const loginWith2Factor = async (req, res) => {
  try {
    // Validate request body structure
    const bodyValidation = validateRequestBody(req.body, ['mobileNumber']);
    if (!bodyValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: bodyValidation.error,
        statusCode: 400
      });
    }

    const { mobileNumber } = req.body;
    
    // Validate mobile number
    const mobileValidation = validateMobile(mobileNumber);
    if (!mobileValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: mobileValidation.error,
        statusCode: 400
      });
    }

    const normalizedMobile = mobileValidation.normalized;
    console.log('🔐 [2FACTOR AUTH] Login attempt for:', normalizedMobile);

    // Check if user exists in database
    const existingUser = await User.findOne({ mobileNumber: normalizedMobile });
    
    if (!existingUser) {
      return apiResponse(res, {
        success: false,
        message: 'User not registered. Please register first.',
        statusCode: 404
      });
    }

    // Bypass 2FA for hardcoded phone number
    if (normalizedMobile === HARDCODED_PHONE) {
      console.log('🔓 [2FACTOR AUTH] Bypassing 2FA for hardcoded phone:', normalizedMobile);
      return apiResponse(res, {
        success: true,
        message: '2FA bypassed for hardcoded phone number',
        data: {
          sessionId: 'bypassed-session-' + Date.now(),
          phoneNumber: normalizedMobile
        },
        statusCode: 200
      });
    }

    // Send OTP using 2Factor
    try {
      console.log('📱 [2FACTOR AUTH] Attempting to send OTP to:', normalizedMobile);
      const otpResult = await twofactorService.sendOTP(normalizedMobile);
      
      if (otpResult.success) {
        console.log('✅ [2FACTOR AUTH] OTP sent successfully to:', normalizedMobile);
        return apiResponse(res, {
          success: true,
          message: 'OTP sent successfully',
          data: {
            sessionId: otpResult.data.sessionId,
            phoneNumber: normalizedMobile
          },
          statusCode: 200
        });
      } else {
        console.error('❌ [2FACTOR AUTH] OTP sending failed:', otpResult.data);
        return apiResponse(res, {
          success: false,
          message: otpResult.data.message || 'Failed to send OTP',
          data: { error: otpResult.data.error || 'Unknown error' },
          statusCode: 400
        });
      }
    } catch (error) {
      console.error('❌ [2FACTOR AUTH] OTP send error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack
      });
      return apiResponse(res, {
        success: false,
        message: error.response?.data?.Details || 'Failed to send OTP due to service error',
        data: { error: error.response?.data?.Status || 'Service error' },
        statusCode: error.response?.status || 400
      });
    }
  } catch (error) {
    console.error('❌ [2FACTOR AUTH] Login error:', {
      message: error.message,
      stack: error.stack
    });
    return apiResponse(res, {
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Register with 2Factor
const registerWith2Factor = async (req, res) => {
  try {
    // Validate request body structure
    const bodyValidation = validateRequestBody(req.body, ['fullName', 'mobileNumber']);
    if (!bodyValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: bodyValidation.error,
        statusCode: 400
      });
    }

    const { fullName, mobileNumber } = req.body;
    
    // Validate full name
    const nameValidation = validateFullName(fullName);
    if (!nameValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: nameValidation.error,
        statusCode: 400
      });
    }

    // Validate mobile number
    const mobileValidation = validateMobile(mobileNumber);
    if (!mobileValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: mobileValidation.error,
        statusCode: 400
      });
    }

    const normalizedName = nameValidation.normalized;
    const normalizedMobile = mobileValidation.normalized;
    
    console.log('📝 [2FACTOR AUTH] Registration attempt for:', { 
      fullName: normalizedName, 
      mobileNumber: normalizedMobile 
    });

    // Check if user already exists
    const existingUser = await User.findOne({ mobileNumber: normalizedMobile });
    
    if (existingUser) {
      return apiResponse(res, {
        success: false,
        message: 'User already registered. Please login instead.',
        statusCode: 400
      });
    }

    // Create new user
    const newUser = new User({
      fullName: normalizedName,
      mobileNumber: normalizedMobile,
      isVerified: normalizedMobile === HARDCODED_PHONE,
      isNumberVerified: normalizedMobile === HARDCODED_PHONE
    });

    await newUser.save();

    // Bypass OTP sending for hardcoded phone number
    if (normalizedMobile === HARDCODED_PHONE) {
      console.log('🔓 [2FACTOR AUTH] Bypassing OTP sending for hardcoded phone:', normalizedMobile);
      const token = jwt.sign(
        { 
          userId: newUser._id, 
          mobileNumber: newUser.mobileNumber,
          fullName: newUser.fullName 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return apiResponse(res, {
        success: true,
        message: 'User registered successfully with 2FA bypassed',
        data: {
          sessionId: 'bypassed-session-' + Date.now(),
          phoneNumber: normalizedMobile,
          userId: newUser._id,
          token,
          user: {
            id: newUser._id,
            fullName: newUser.fullName,
            mobileNumber: newUser.mobileNumber,
            isVerified: newUser.isVerified,
            isNumberVerified: newUser.isNumberVerified
          }
        },
        statusCode: 200
      });
    }

    // Send OTP using 2Factor
    try {
      console.log('📱 [2FACTOR AUTH] Attempting to send OTP to:', normalizedMobile);
      const otpResult = await twofactorService.sendOTP(normalizedMobile);
      
      if (otpResult.success) {
        console.log('✅ [2FACTOR AUTH] OTP sent successfully to:', normalizedMobile);
        return apiResponse(res, {
          success: true,
          message: 'User registered and OTP sent successfully',
          data: {
            sessionId: otpResult.data.sessionId,
            phoneNumber: normalizedMobile,
            userId: newUser._id
          },
          statusCode: 200
        });
      } else {
        console.error('❌ [2FACTOR AUTH] OTP sending failed:', otpResult.data);
        await User.findByIdAndDelete(newUser._id);
        return apiResponse(res, {
          success: false,
          message: otpResult.data.message || 'Failed to send OTP',
          data: { error: otpResult.data.error || 'Unknown error' },
          statusCode: 400
        });
      }
    } catch (error) {
      console.error('❌ [2FACTOR AUTH] OTP send error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack
      });
      await User.findByIdAndDelete(newUser._id);
      return apiResponse(res, {
        success: false,
        message: error.response?.data?.Details || 'Failed to send OTP due to service error',
        data: { error: error.response?.data?.Status || 'Service error' },
        statusCode: error.response?.status || 400
      });
    }
  } catch (error) {
    console.error('❌ [2FACTOR AUTH] Registration error:', {
      message: error.message,
      stack: error.stack
    });
    return apiResponse(res, {
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Verify OTP with 2Factor
const verifyOTPWith2Factor = async (req, res) => {
  try {
    // Validate request body structure
    const bodyValidation = validateRequestBody(req.body, ['mobileNumber', 'otp', 'sessionId']);
    if (!bodyValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: bodyValidation.error,
        statusCode: 400
      });
    }

    const { mobileNumber, otp, sessionId } = req.body;
    
    // Validate mobile number
    const mobileValidation = validateMobile(mobileNumber);
    if (!mobileValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: mobileValidation.error,
        statusCode: 400
      });
    }

    // Validate OTP
    const otpValidation = validateOTP(otp);
    if (!otpValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: otpValidation.error,
        statusCode: 400
      });
    }

    // Validate session ID
    const sessionValidation = validateSessionId(sessionId);
    if (!sessionValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: sessionValidation.error,
        statusCode: 400
      });
    }

    const normalizedMobile = mobileValidation.normalized;
    const normalizedOTP = otpValidation.normalized;
    const normalizedSessionId = sessionValidation.normalized;

    console.log('✅ [2FACTOR AUTH] OTP verification attempt for:', normalizedMobile);

    // Bypass OTP verification for hardcoded phone number and OTP
    if (normalizedMobile === HARDCODED_PHONE && normalizedOTP === HARDCODED_OTP) {
      console.log('🔓 [2FACTOR AUTH] Bypassing OTP verification for hardcoded phone and OTP:', normalizedMobile);
      const user = await User.findOne({ mobileNumber: normalizedMobile });
      
      if (user) {
        user.isNumberVerified = true;
        user.isVerified = true;
        await user.save();

        const token = jwt.sign(
          { 
            userId: user._id, 
            mobileNumber: user.mobileNumber,
            fullName: user.fullName 
          },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return apiResponse(res, {
          success: true,
          message: '2FA bypassed successfully',
          data: {
            token,
            user: {
              id: user._id,
              fullName: user.fullName,
              mobileNumber: user.mobileNumber,
              isVerified: user.isVerified,
              isNumberVerified: user.isNumberVerified
            }
          },
          statusCode: 200
        });
      } else {
        return apiResponse(res, {
          success: false,
          message: 'User not found',
          statusCode: 404
        });
      }
    }

    // Verify OTP using 2Factor
    try {
      console.log('🔍 [2FACTOR AUTH] Attempting OTP verification for:', {
        mobileNumber: normalizedMobile,
        sessionId: normalizedSessionId
      });
      const verifyResult = await twofactorService.verifyOTP(normalizedMobile, normalizedOTP, normalizedSessionId);
      
      console.log('🔍 [2FACTOR AUTH] 2Factor verification result:', verifyResult);
      
      if (verifyResult.success) {
        const user = await User.findOne({ mobileNumber: normalizedMobile });
        
        console.log('🔍 [2FACTOR AUTH] User found for verification:', {
          userId: user?._id,
          mobileNumber: user?.mobileNumber,
          currentIsNumberVerified: user?.isNumberVerified,
          currentIsVerified: user?.isVerified
        });
        
        if (user) {
          user.isNumberVerified = true;
          user.isVerified = true;
          await user.save();

          const updatedUser = await User.findById(user._id);
          console.log('✅ [2FACTOR AUTH] User verification status updated:', {
            isNumberVerified: updatedUser.isNumberVerified,
            isVerified: updatedUser.isVerified,
            userId: updatedUser._id
          });

          const token = jwt.sign(
            { 
              userId: user._id, 
              mobileNumber: user.mobileNumber,
              fullName: user.fullName 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
          );

          return apiResponse(res, {
            success: true,
            message: 'OTP verified successfully',
            data: {
              token,
              user: {
                id: user._id,
                fullName: user.fullName,
                mobileNumber: user.mobileNumber,
                isVerified: user.isVerified,
                isNumberVerified: user.isNumberVerified
              }
            },
            statusCode: 200
          });
        } else {
          return apiResponse(res, {
            success: false,
            message: 'User not found',
            statusCode: 404
          });
        }
      } else {
        console.error('❌ [2FACTOR AUTH] OTP verification failed:', {
          message: verifyResult.data?.message,
          error: verifyResult.data?.error,
          details: verifyResult.data?.details
        });
        const errorMessage = verifyResult.data?.message || verifyResult.message || 'OTP verification failed';
        const errorType = verifyResult.data?.error || '';
        const errorDetails = verifyResult.data?.details || '';
        
        if (errorType === 'INVALID_OTP') {
          return apiResponse(res, {
            success: false,
            message: errorMessage,
            data: { 
              error: 'INVALID_OTP',
              details: errorDetails || 'The OTP you entered is incorrect'
            },
            statusCode: 400
          });
        } else if (errorType === 'OTP_EXPIRED') {
          return apiResponse(res, {
            success: false,
            message: errorMessage,
            data: { 
              error: 'OTP_EXPIRED',
              details: errorDetails || 'The OTP has expired. Please resend OTP and try again'
            },
            statusCode: 400
          });
        } else if (errorType === 'SESSION_EXPIRED') {
          return apiResponse(res, {
            success: false,
            message: errorMessage,
            data: { 
              error: 'SESSION_EXPIRED',
              details: errorDetails || 'Your verification session has expired. Please login again'
            },
            statusCode: 400
          });
        } else {
          if (errorMessage.toLowerCase().includes('invalid') || 
              errorMessage.toLowerCase().includes('wrong') ||
              errorMessage.toLowerCase().includes('incorrect') ||
              errorMessage.toLowerCase().includes('mismatch') ||
              errorDetails.toLowerCase().includes('invalid') ||
              errorDetails.toLowerCase().includes('wrong') ||
              errorDetails.toLowerCase().includes('incorrect') ||
              errorDetails.toLowerCase().includes('mismatch')) {
            
            return apiResponse(res, {
              success: false,
              message: 'Invalid OTP. Please check and try again.',
              data: { 
                error: 'INVALID_OTP',
                details: 'The OTP you entered is incorrect'
              },
              statusCode: 400
            });
          } else if (errorMessage.toLowerCase().includes('expired') || 
                     errorDetails.toLowerCase().includes('expired')) {
            
            return apiResponse(res, {
              success: false,
              message: 'OTP has expired. Please request a new OTP.',
              data: { 
                error: 'OTP_EXPIRED',
                details: 'The OTP has expired. Please resend OTP and try again'
              },
              statusCode: 400
            });
          } else if (errorMessage.toLowerCase().includes('session') || 
                     errorDetails.toLowerCase().includes('session')) {
            
            return apiResponse(res, {
              success: false,
              message: 'Session expired. Please start the verification process again.',
              data: { 
                error: 'SESSION_EXPIRED',
                details: 'Your verification session has expired. Please login again'
              },
              statusCode: 400
            });
          } else {
            return apiResponse(res, {
              success: false,
              message: errorMessage,
              data: { 
                error: 'VERIFICATION_FAILED',
                details: errorDetails
              },
              statusCode: 400
            });
          }
        }
      }
    } catch (error) {
      console.error('❌ [2FACTOR AUTH] OTP verification error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack
      });
      return apiResponse(res, {
        success: false,
        message: error.response?.data?.Details || 'OTP verification failed due to service error',
        data: { error: error.response?.data?.Status || 'Service error' },
        statusCode: error.response?.status || 400
      });
    }
  } catch (error) {
    console.error('❌ [2FACTOR AUTH] OTP verification error:', {
      message: error.message,
      stack: error.stack
    });
    return apiResponse(res, {
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Resend OTP with 2Factor
const resendOTPWith2Factor = async (req, res) => {
  try {
    // Validate request body structure
    const bodyValidation = validateRequestBody(req.body, ['mobileNumber']);
    if (!bodyValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: bodyValidation.error,
        statusCode: 400
      });
    }

    const { mobileNumber } = req.body;
    
    // Validate mobile number
    const mobileValidation = validateMobile(mobileNumber);
    if (!mobileValidation.isValid) {
      return apiResponse(res, {
        success: false,
        message: mobileValidation.error,
        statusCode: 400
      });
    }

    const normalizedMobile = mobileValidation.normalized;
    console.log('🔄 [2FACTOR AUTH] Resend OTP attempt for:', normalizedMobile);

    // Bypass OTP resend for hardcoded phone number
    if (normalizedMobile === HARDCODED_PHONE) {
      console.log('🔓 [2FACTOR AUTH] Bypassing OTP resend for hardcoded phone:', normalizedMobile);
      return apiResponse(res, {
        success: true,
        message: 'OTP resend bypassed for hardcoded phone number',
        data: {
          sessionId: 'bypassed-session-' + Date.now(),
          phoneNumber: normalizedMobile
        },
        statusCode: 200
      });
    }

    // Resend OTP using 2Factor
    try {
      console.log('📱 [2FACTOR AUTH] Attempting to resend OTP to:', normalizedMobile);
      const resendResult = await twofactorService.resendOTP(normalizedMobile);
      
      if (resendResult.success) {
        console.log('✅ [2FACTOR AUTH] OTP resent successfully to:', normalizedMobile);
        return apiResponse(res, {
          success: true,
          message: 'OTP resent successfully',
          data: {
            sessionId: resendResult.data.sessionId,
            phoneNumber: normalizedMobile
          },
          statusCode: 200
        });
      } else {
        console.error('❌ [2FACTOR AUTH] OTP resend failed:', resendResult.data);
        return apiResponse(res, {
          success: false,
          message: resendResult.data.message || 'Failed to resend OTP',
          data: { error: resendResult.data.error || 'Unknown error' },
          statusCode: 400
        });
      }
    } catch (error) {
      console.error('❌ [2FACTOR AUTH] OTP resend error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack
      });
      return apiResponse(res, {
        success: false,
        message: error.response?.data?.Details || 'Failed to resend OTP due to service error',
        data: { error: error.response?.data?.Status || 'Service error' },
        statusCode: error.response?.status || 400
      });
    }
  } catch (error) {
    console.error('❌ [2FACTOR AUTH] Resend OTP error:', {
      message: error.message,
      stack: error.stack
    });
    return apiResponse(res, {
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Check 2Factor service status
const check2FactorStatus = async (req, res) => {
  try {
    console.log('🔍 [2FACTOR AUTH] Checking 2Factor service status...');
    
    const statusResult = await twofactorService.checkServiceStatus();
    
    if (statusResult.success) {
      console.log('✅ [2FACTOR AUTH] 2Factor service status:', statusResult.data);
      return apiResponse(res, {
        success: true,
        message: '2Factor service is operational',
        data: statusResult.data,
        statusCode: 200
      });
    } else {
      console.error('❌ [2FACTOR AUTH] 2Factor service status check failed:', statusResult.data);
      return apiResponse(res, {
        success: false,
        message: '2Factor service is not operational',
        data: { error: statusResult.data.message || 'Unknown error' },
        statusCode: 500
      });
    }
  } catch (error) {
    console.error('❌ [2FACTOR AUTH] Status check error:', {
      message: error.message,
      stack: error.stack
    });
    return apiResponse(res, {
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

module.exports = {
  loginWith2Factor,
  registerWith2Factor,
  verifyOTPWith2Factor,
  resendOTPWith2Factor,
  check2FactorStatus
};