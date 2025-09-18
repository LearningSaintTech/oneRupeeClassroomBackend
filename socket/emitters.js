const eventNames = require('./eventNames');

const emitLiveLesson = (io, userId, data) => {
  io.to(userId.toString()).emit(eventNames.LIVE_LESSON, data);
};

const emitRequestInternshipLetter = (io, userId, data) => {
  console.log("io",io)
  console.log("userID",userId)
  console.log("data",data)
  console.log("eventNames.REQUEST_INTERNSHIP_LETTER",eventNames.REQUEST_INTERNSHIP_LETTER)
  io.to(userId.toString()).emit(eventNames.REQUEST_INTERNSHIP_LETTER, data);
};

const emitUploadInternshipLetter = (io, userId, data) => {
  io.to(userId.toString()).emit(eventNames.UPLOAD_INTERNSHIP_LETTER, data);
};

const emitBuyCourse = (io, userId, data) => {
  io.to(userId.toString()).emit(eventNames.BUY_COURSE, data);
};

const emitGlobalNotification = (io, data) => {
  io.emit(eventNames.GLOBAL_NOTIFICATION, data);
};


module.exports = {
  emitLiveLesson,
  emitRequestInternshipLetter,
  emitUploadInternshipLetter,
  emitBuyCourse,
  emitGlobalNotification
};