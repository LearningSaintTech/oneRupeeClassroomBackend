import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  autoConnect: false,
});

const SocketService = {
  connect: (userId) => {
    return new Promise((resolve, reject) => {
      socket.connect();

      socket.on('connect', () => {
        console.log('Connected to Socket.IO server');
        socket.emit('join', userId);
        resolve();
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        reject(error);
      });
    });
  },

  onLiveLesson: (callback) => {
    socket.on('live_lesson', (data) => {
      console.log('Live lesson event received:', data);
      callback(data);
    });
  },

  onRequestInternshipLetter: (callback) => {
    socket.on('request_internship_letter', (data) => {
      console.log('Request internship letter event received:', data);
      callback(data);
    });
  },

  onUploadInternshipLetter: (callback) => {
    socket.on('upload_internship_letter', (data) => {
      console.log('Upload internship letter event received:', data);
      callback(data);
    });
  },

  onBuyCourse: (callback) => {
    socket.on('buy_course', (data) => {
      console.log('Buy course event received:', data);
      callback(data);
    });
  },

   onGlobalNotification: (callback) => {
    socket.on('global_notification', (data) => {
      console.log('Global notification event received:', data);
      callback(data);
    });
  },

  disconnect: () => {
    socket.disconnect();
    console.log('Disconnected from Socket.IO server');
  },
};

export default SocketService;