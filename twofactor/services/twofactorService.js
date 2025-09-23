const { twofactorClient, twofactorConfig } = require('../config/twofactorConfig');

class TwoFactorService {
  // Send OTP using 2Factor
  async sendOTP(mobileNumber) {
    try {
      console.log('📱 [2FACTOR SERVICE] Sending OTP to:', mobileNumber);
      
      const response = await twofactorClient.get('/API/V1/' + twofactorConfig.apiKey + '/SMS/' + mobileNumber + '/AUTOGEN/' + twofactorConfig.templateName);
      
      console.log('✅ [2FACTOR SERVICE] OTP sent successfully:', response.data);
      
      if (response.data.Status === 'Success') {
        return {
          success: true,
          data: {
            message: 'OTP sent successfully',
            sessionId: response.data.Details,
            phoneNumber: mobileNumber,
            status: response.data.Status
          }
        };
      } else {
        return {
          success: false,
          data: {
            message: 'Failed to send OTP: ' + response.data.Details,
            error: response.data.Status,
            phoneNumber: mobileNumber
          }
        };
      }
    } catch (error) {
      console.error('❌ [2FACTOR SERVICE] Send OTP error:', error);
      return {
        success: false,
        data: {
          message: 'Failed to send OTP: ' + error.message,
          error: error.code || 'unknown-error',
          phoneNumber: mobileNumber
        }
      };
    }
  }

  // Verify OTP using 2Factor
  async verifyOTP(mobileNumber, otp, sessionId) {
    try {
      console.log('📱 [2FACTOR SERVICE] Verifying OTP for:', mobileNumber);
      
      const response = await twofactorClient.get('/API/V1/' + twofactorConfig.apiKey + '/SMS/VERIFY/' + sessionId + '/' + otp);
      
      console.log('✅ [2FACTOR SERVICE] OTP verification result:', response.data);
      
      if (response.data.Status === 'Success') {
        return {
          success: true,
          data: {
            message: 'OTP verified successfully',
            phoneNumber: mobileNumber,
            status: response.data.Status,
            details: response.data.Details
          }
        };
      } else {
        return {
          success: false,
          data: {
            message: 'Invalid OTP: ' + response.data.Details,
            status: response.data.Status,
            phoneNumber: mobileNumber
          }
        };
      }
    } catch (error) {
      console.error('❌ [2FACTOR SERVICE] Verify OTP error:', error);
      
      // Check if it's a 2Factor API error with response data
      if (error.response && error.response.data) {
        console.log('🔍 [2FACTOR SERVICE] 2Factor API error response:', error.response.data);
        
        // Handle specific 2Factor error responses
        if (error.response.data.Status === 'Error') {
          const errorDetails = error.response.data.Details || 'Unknown error';
          
          // Check for specific error types
          if (errorDetails.toLowerCase().includes('otp mismatch') || 
              errorDetails.toLowerCase().includes('invalid otp') ||
              errorDetails.toLowerCase().includes('wrong otp')) {
            return {
              success: false,
              data: {
                message: 'Invalid OTP. Please check and try again.',
                error: 'INVALID_OTP',
                details: errorDetails,
                phoneNumber: mobileNumber
              }
            };
          } else if (errorDetails.toLowerCase().includes('expired') ||
                     errorDetails.toLowerCase().includes('timeout')) {
            return {
              success: false,
              data: {
                message: 'OTP has expired. Please request a new OTP.',
                error: 'OTP_EXPIRED',
                details: errorDetails,
                phoneNumber: mobileNumber
              }
            };
          } else if (errorDetails.toLowerCase().includes('session') ||
                     errorDetails.toLowerCase().includes('invalid session')) {
            return {
              success: false,
              data: {
                message: 'Session expired. Please start the verification process again.',
                error: 'SESSION_EXPIRED',
                details: errorDetails,
                phoneNumber: mobileNumber
              }
            };
          } else {
            return {
              success: false,
              data: {
                message: 'OTP verification failed: ' + errorDetails,
                error: 'VERIFICATION_FAILED',
                details: errorDetails,
                phoneNumber: mobileNumber
              }
            };
          }
        }
      }
      
      // Generic error handling
      return {
        success: false,
        data: {
          message: 'OTP verification failed: ' + error.message,
          error: error.code || 'unknown-error',
          phoneNumber: mobileNumber
        }
      };
    }
  }

  // Resend OTP using 2Factor (same as sendOTP)
  async resendOTP(mobileNumber) {
    try {
      console.log('🔄 [2FACTOR SERVICE] Resending OTP to:', mobileNumber);
      
      // 2Factor doesn't have separate resend, so we call sendOTP again
      return await this.sendOTP(mobileNumber);
    } catch (error) {
      console.error('❌ [2FACTOR SERVICE] Resend OTP error:', error);
      return {
        success: false,
        data: {
          message: 'Failed to resend OTP: ' + error.message,
          error: error.code || 'unknown-error',
          phoneNumber: mobileNumber
        }
      };
    }
  }

  // Check 2Factor service status
  async checkServiceStatus() {
    try {
      console.log('🔍 [2FACTOR SERVICE] Checking service status...');
      
      // Test with a dummy number to check if service is operational
      const testResponse = await twofactorClient.get('/API/V1/' + twofactorConfig.apiKey + '/BAL');
      
      console.log('✅ [2FACTOR SERVICE] Service status:', testResponse.data);
      
      if (testResponse.data.Status === 'Success') {
        return {
          success: true,
          data: {
            status: 'operational',
            balance: testResponse.data.Details,
            apiKey: twofactorConfig.apiKey
          }
        };
      } else {
        return {
          success: false,
          data: {
            message: 'Service not operational: ' + testResponse.data.Details,
            status: testResponse.data.Status
          }
        };
      }
    } catch (error) {
      console.error('❌ [2FACTOR SERVICE] Service status check error:', error);
      return {
        success: false,
        data: {
          message: 'Failed to check service status: ' + error.message,
          error: error.code || 'unknown-error'
        }
      };
    }
  }
}

module.exports = new TwoFactorService();
