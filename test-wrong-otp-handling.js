// Test script to verify wrong OTP handling
const testWrongOTPHandling = () => {
  console.log('🧪 Testing Wrong OTP Handling...');
  
  // Simulate different 2Factor error responses
  const testCases = [
    {
      name: 'Invalid OTP',
      verifyResult: {
        success: false,
        data: {
          message: 'Invalid OTP code',
          error: 'The OTP you entered is incorrect'
        }
      },
      expectedError: 'INVALID_OTP',
      expectedMessage: 'Invalid OTP. Please check and try again.'
    },
    {
      name: 'Wrong OTP',
      verifyResult: {
        success: false,
        data: {
          message: 'Wrong OTP entered',
          error: 'OTP verification failed'
        }
      },
      expectedError: 'INVALID_OTP',
      expectedMessage: 'Invalid OTP. Please check and try again.'
    },
    {
      name: 'Expired OTP',
      verifyResult: {
        success: false,
        data: {
          message: 'OTP has expired',
          error: 'The OTP is no longer valid'
        }
      },
      expectedError: 'OTP_EXPIRED',
      expectedMessage: 'OTP has expired. Please request a new OTP.'
    },
    {
      name: 'Session Expired',
      verifyResult: {
        success: false,
        data: {
          message: 'Session expired',
          error: 'Your verification session has ended'
        }
      },
      expectedError: 'SESSION_EXPIRED',
      expectedMessage: 'Session expired. Please start the verification process again.'
    },
    {
      name: 'Generic Error',
      verifyResult: {
        success: false,
        data: {
          message: 'Service temporarily unavailable',
          error: '2Factor service is down'
        }
      },
      expectedError: 'VERIFICATION_FAILED',
      expectedMessage: 'Service temporarily unavailable'
    }
  ];
  
  console.log('\n📋 Test Cases:');
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`);
    console.log(`   Input: ${JSON.stringify(testCase.verifyResult, null, 2)}`);
    
    // Simulate the error handling logic
    const errorMessage = testCase.verifyResult.data?.message || testCase.verifyResult.message || 'OTP verification failed';
    const errorDetails = testCase.verifyResult.data?.error || '';
    
    let detectedError = 'VERIFICATION_FAILED';
    let detectedMessage = errorMessage;
    
    if (errorMessage.toLowerCase().includes('invalid') || 
        errorMessage.toLowerCase().includes('wrong') ||
        errorMessage.toLowerCase().includes('incorrect') ||
        errorMessage.toLowerCase().includes('expired') ||
        errorDetails.toLowerCase().includes('invalid') ||
        errorDetails.toLowerCase().includes('wrong') ||
        errorDetails.toLowerCase().includes('incorrect')) {
      
      if (errorMessage.toLowerCase().includes('expired') || 
          errorDetails.toLowerCase().includes('expired')) {
        detectedError = 'OTP_EXPIRED';
        detectedMessage = 'OTP has expired. Please request a new OTP.';
      } else {
        detectedError = 'INVALID_OTP';
        detectedMessage = 'Invalid OTP. Please check and try again.';
      }
    } else if (errorMessage.toLowerCase().includes('session') || 
               errorDetails.toLowerCase().includes('session')) {
      detectedError = 'SESSION_EXPIRED';
      detectedMessage = 'Session expired. Please start the verification process again.';
    }
    
    const isCorrect = detectedError === testCase.expectedError && detectedMessage === testCase.expectedMessage;
    
    console.log(`   Expected: ${testCase.expectedError} - "${testCase.expectedMessage}"`);
    console.log(`   Detected: ${detectedError} - "${detectedMessage}"`);
    console.log(`   Result: ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  console.log('\n🎯 Expected API Responses:');
  console.log('1. Wrong OTP → 400 status, "Invalid OTP. Please check and try again."');
  console.log('2. Expired OTP → 400 status, "OTP has expired. Please request a new OTP."');
  console.log('3. Session Expired → 400 status, "Session expired. Please start the verification process again."');
  console.log('4. Generic Error → 400 status, Original error message');
};

// Run the test
testWrongOTPHandling();
