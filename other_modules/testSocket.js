const io = require('socket.io-client');

// Backend WebSocket server URL
const SOCKET_URL = 'http://172.24.112.1:3000'; // Update to your backend URL
const TEST_USER_ID = '68ac5f395c350e54e984aebe'; // Test user ID; replace with a valid userId from your database

// Initialize Socket.IO client
const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: false,
});

console.log(`Attempting to connect to ${SOCKET_URL} with userId: ${TEST_USER_ID}`);

// Connect to the server
socket.connect();

// Handle connection
socket.on('connect', () => {
  console.log(`✅ Connected to Socket.IO server with socket ID: ${socket.id}`);
  // Join user-specific room
  socket.emit('join', TEST_USER_ID);
  console.log(`📌 Emitted 'join' event for userId: ${TEST_USER_ID}`);
});

// Handle connection errors
socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Listen for live_lesson event
socket.on('live_lesson', (data) => {
  console.log('🔔 Received live_lesson event:', JSON.stringify(data, null, 2));
});

// Listen for buy_course event
socket.on('buy_course', (data) => {
  console.log('🔔 Received buy_course event:', JSON.stringify(data, null, 2));
});

// Listen for request_internship_letter event
socket.on('request_internship_letter', (data) => {
  console.log('🔔 Received request_internship_letter event:', JSON.stringify(data, null, 2));
});

// Listen for upload_internship_letter event
socket.on('upload_internship_letter', (data) => {
  console.log('🔔 Received upload_internship_letter event:', JSON.stringify(data, null, 2));
});

// Handle disconnection
socket.on('disconnect', (reason) => {
  console.log(`❌ Disconnected from Socket.IO server. Reason: ${reason}`);
});

// Optional: Auto-disconnect after a timeout (e.g., 5 minutes) for testing
setTimeout(() => {
  console.log('⏰ Test timeout reached, disconnecting...');
  socket.disconnect();
}, 300000); // 5 minutes in milliseconds