const admin = require('firebase-admin');
require("dotenv").config()

// Firebase configurations for different projects
const firebaseConfigs = {
  website: {
    type: process.env.FIREBASE_WEBSITE_TYPE,
    project_id: process.env.FIREBASE_WEBSITE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_WEBSITE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_WEBSITE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_WEBSITE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_WEBSITE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_WEBSITE_AUTH_URI,
    token_uri: process.env.FIREBASE_WEBSITE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_WEBSITE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_WEBSITE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_WEBSITE_UNIVERSE_DOMAIN,
  },
  app: {
    type: process.env.FIREBASE_APP_TYPE,
    project_id: process.env.FIREBASE_APP_PROJECT_ID,
    private_key_id: process.env.FIREBASE_APP_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_APP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_APP_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_APP_CLIENT_ID,
    auth_uri: process.env.FIREBASE_APP_AUTH_URI,
    token_uri: process.env.FIREBASE_APP_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_APP_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_APP_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_APP_UNIVERSE_DOMAIN,
  }
};

// Initialize Firebase Admin SDKs for both projects
const firebaseApps = {};

// Initialize Website Firebase
if (!admin.apps.find(app => app.name === 'website')) {
  try {
    firebaseApps.website = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfigs.website),
    }, 'website');
    console.log('✅ [Firebase Config] Website Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ [Firebase Config] Website Firebase Admin initialization error:', error);
  }
} else {
  firebaseApps.website = admin.app('website');
  console.log('✅ [Firebase Config] Website Firebase Admin already initialized');
}

// Initialize App Firebase
if (!admin.apps.find(app => app.name === 'app')) {
  try {
    firebaseApps.app = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfigs.app),
    }, 'app');
    console.log('✅ [Firebase Config] App Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ [Firebase Config] App Firebase Admin initialization error:', error);
  }
} else {
  firebaseApps.app = admin.app('app');
  console.log('✅ [Firebase Config] App Firebase Admin already initialized');
}

// Function to determine which Firebase project to use based on FCM token
function getFirebaseAppForToken(fcmToken) {
  console.log('🔍 [Firebase Config] Determining Firebase app for token:', {
    tokenPrefix: fcmToken ? fcmToken.substring(0, 20) + '...' : 'null',
    websiteProjectId: firebaseConfigs.website.project_id,
    appProjectId: firebaseConfigs.app.project_id
  });
  
  // Check if token contains project-specific identifiers
  if (fcmToken && firebaseConfigs.website.project_id && fcmToken.includes(firebaseConfigs.website.project_id)) {
    console.log('✅ [Firebase Config] Using Website Firebase for token');
    return firebaseApps.website;
  } else if (fcmToken && firebaseConfigs.app.project_id && fcmToken.includes(firebaseConfigs.app.project_id)) {
    console.log('✅ [Firebase Config] Using App Firebase for token');
    return firebaseApps.app;
  }
  
  // Since FCM tokens don't contain project IDs, we need a different approach
  // Let's try both Firebase projects and see which one works
  console.log('🔍 [Firebase Config] Token format analysis - trying both projects...');
  
  // For now, let's use a more sophisticated approach
  // We'll try to determine based on the token pattern or user context
  // Since we can't reliably detect from token alone, let's try App Firebase first
  // (since the error shows it's likely from the app project)
  
  console.log('🔍 [Firebase Config] Using App Firebase as primary choice (based on error analysis)');
  return firebaseApps.app;
}

// Function to send notification using the appropriate Firebase project
async function sendNotificationToToken(fcmToken, message) {
  // Try Website Firebase first
  try {
    console.log('🔔 [Firebase Config] Trying Website Firebase first...');
    const websiteMessaging = firebaseApps.website.messaging();
    const response = await websiteMessaging.send(message);
    console.log('✅ [Firebase Config] Notification sent successfully via Website Firebase:', response);
    return response;
  } catch (websiteError) {
    console.log('⚠️ [Firebase Config] Website Firebase failed:', websiteError.message);
    
    // If Website Firebase fails, try App Firebase
    try {
      console.log('🔔 [Firebase Config] Trying App Firebase as fallback...');
      const appMessaging = firebaseApps.app.messaging();
      const response = await appMessaging.send(message);
      console.log('✅ [Firebase Config] Notification sent successfully via App Firebase:', response);
      return response;
    } catch (appError) {
      console.error('❌ [Firebase Config] Both Firebase projects failed:');
      console.error('  Website Error:', websiteError.message);
      console.error('  App Error:', appError.message);
      throw appError; // Throw the last error
    }
  }
}

// Log configuration status
console.log('🔔 [Firebase Config] Configuration check:', {
  website: {
    hasType: !!process.env.FIREBASE_WEBSITE_TYPE,
    hasProjectId: !!process.env.FIREBASE_WEBSITE_PROJECT_ID,
    hasPrivateKey: !!process.env.FIREBASE_WEBSITE_PRIVATE_KEY,
    hasClientEmail: !!process.env.FIREBASE_WEBSITE_CLIENT_EMAIL,
    projectId: process.env.FIREBASE_WEBSITE_PROJECT_ID,
  },
  app: {
    hasType: !!process.env.FIREBASE_APP_TYPE,
    hasProjectId: !!process.env.FIREBASE_APP_PROJECT_ID,
    hasPrivateKey: !!process.env.FIREBASE_APP_PRIVATE_KEY,
    hasClientEmail: !!process.env.FIREBASE_APP_CLIENT_EMAIL,
    projectId: process.env.FIREBASE_APP_PROJECT_ID,
  }
});

module.exports = {
  firebaseApps,
  getFirebaseAppForToken,
  sendNotificationToToken,
  firebaseConfigs
};
