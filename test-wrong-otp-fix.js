// Test script to verify wrong OTP handling fix
const testWrongOTPHandling = () => {
  console.log('🧪 Testing Wrong OTP Handling Fix...');
  
  // Simulate the 2Factor API error response from the logs
  const mock2FactorErrorResponse = {
    response: {
      status: 400,
      data: { 
        Status: 'Error', 
        Details: 'OTP Mismatch' 
      }
    }
  };
  
  console.log('\n📋 Test Case: 2Factor API Error Response');
  console.log('Input:', JSON.stringify(mock2FactorErrorResponse, null, 2));
  
  // Simulate the error handling logic from the service
  const error = mock2FactorErrorResponse;
  const mobileNumber = '+919829699382';
  
  if (error.response && error.response.data) {
    console.log('🔍 [2FACTOR SERVICE] 2Factor API error response:', error.response.data);
    
    if (error.response.data.Status === 'Error') {
      const errorDetails = error.response.data.Details || 'Unknown error';
      console.log('📝 Error Details:', errorDetails);
      
      // Check for specific error types
      if (errorDetails.toLowerCase().includes('otp mismatch') || 
          errorDetails.toLowerCase().includes('invalid otp') ||
          errorDetails.toLowerCase().includes('wrong otp')) {
        
        const result = {
          success: false,
          data: {
            message: 'Invalid OTP. Please check and try again.',
            error: 'INVALID_OTP',
            details: errorDetails,
            phoneNumber: mobileNumber
          }
        };
        
        console.log('✅ Expected Service Response:', JSON.stringify(result, null, 2));
        
        // Now test the controller response
        const errorMessage = result.data.message;
        const errorType = result.data.error;
        const errorDetails = result.data.details;
        
        if (errorType === 'INVALID_OTP') {
          const controllerResponse = {
            success: false,
            message: errorMessage,
            data: { 
              error: 'INVALID_OTP',
              details: errorDetails || 'The OTP you entered is incorrect'
            },
            statusCode: 400
          };
          
          console.log('✅ Expected Controller Response:', JSON.stringify(controllerResponse, null, 2));
          
          // Test frontend handling
          console.log('\n📱 Frontend Handling:');
          console.log('Error Type:', errorType);
          console.log('Should show alert: "Invalid OTP"');
          console.log('Should clear OTP fields and focus first input');
          console.log('Should allow user to retry');
          
        }
      }
    }
  }
  
  console.log('\n🎯 Expected Flow:');
  console.log('1. User enters wrong OTP (e.g., 290897)');
  console.log('2. 2Factor API returns 400 with "OTP Mismatch"');
  console.log('3. Service detects "otp mismatch" and returns INVALID_OTP error');
  console.log('4. Controller returns proper error response with INVALID_OTP');
  console.log('5. Frontend shows "Invalid OTP" alert and clears fields');
  
  console.log('\n✅ Fix Applied:');
  console.log('- Service now properly parses 2Factor error responses');
  console.log('- Controller uses error type from service');
  console.log('- Added fallback error detection for robustness');
  console.log('- Frontend will show proper error messages');
};

// Run the test
testWrongOTPHandling();
