const admin = require('firebase-admin');
require("dotenv").config();

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
  },
  ios: { // Client-side only
    apiKey: process.env.FIREBASE_IOS_API_KEY,
    gcmSenderId: process.env.FIREBASE_IOS_GCM_SENDER_ID,
    plistVersion: process.env.FIREBASE_IOS_PLIST_VERSION,
    bundleId: process.env.FIREBASE_IOS_BUNDLE_ID,
    projectId: process.env.FIREBASE_IOS_PROJECT_ID,
    storageBucket: process.env.FIREBASE_IOS_STORAGE_BUCKET,
    googleAppId: process.env.FIREBASE_IOS_GOOGLE_APP_ID,
  }
};

const firebaseApps = {};

// ✅ Default Firebase App (Uses `app` config by default)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfigs.app),
  });
  console.log('✅ Default Firebase Admin initialized');
}

// ✅ Website Firebase
if (!admin.apps.find(app => app.name === 'website')) {
  firebaseApps.website = admin.initializeApp({
    credential: admin.credential.cert(firebaseConfigs.website),
  }, 'website');
  console.log('✅ Website Firebase Admin initialized');
} else {
  firebaseApps.website = admin.app('website');
}

// ✅ App Firebase
if (!admin.apps.find(app => app.name === 'app')) {
  firebaseApps.app = admin.initializeApp({
    credential: admin.credential.cert(firebaseConfigs.app),
  }, 'app');
  console.log('✅ App Firebase Admin initialized');
} else {
  firebaseApps.app = admin.app('app');
}

// ✅ Get Firebase app for token
function getFirebaseAppForToken(fcmToken) {
  if (fcmToken && fcmToken.includes(firebaseConfigs.website.project_id)) {
    return firebaseApps.website;
  }
  return firebaseApps.app; // default to app
}

// ✅ Send notification
async function sendNotificationToToken(fcmToken, message) {
  try {
    return await firebaseApps.website.messaging().send(message);
  } catch {
    return await firebaseApps.app.messaging().send(message);
  }
}

// ✅ Export everything
module.exports = {
  admin,
  firebaseApps,
  getFirebaseAppForToken,
  sendNotificationToToken,
  firebaseConfigs
};
