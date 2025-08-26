const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
    auth: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGFjNWYzOTVjMzUwZTU0ZTk4NGFlYmQiLCJtb2JpbGVOdW1iZXIiOiIrOTExMjM0NTY3ODkwIiwiaWF0IjoxNzU2MTk5MTA3LCJleHAiOjE3NTY4MDM5MDd9.47SEmXdWzf5hyrs8UNG3ulz-ClhfCIjFiTJJ8hATiOo' },
    transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
    console.log('Connected to Socket.IO server:', socket.id);
    socket.emit('join', '68ac5f395c350e54e984aebd');
});

socket.on('lesson_notification', (data) => {
    console.log('Received lesson notification:', data);
});

socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
});

socket.on('error', (err) => {
    console.error('Socket error:', err.message);
});