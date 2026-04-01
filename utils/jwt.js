const jwt = require('jsonwebtoken');

const generateAccessToken = (user) => {
  const secret = process.env.ACCESS_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('ACCESS_SECRET or JWT_SECRET must be set');
  }

  return jwt.sign(
    { userId: user._id, role: user.role },
    secret,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (user) => {
  const secret = process.env.REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('REFRESH_SECRET or JWT_SECRET must be set');
  }

  return jwt.sign(
    { userId: user._id },
    secret,
    { expiresIn: '7d' }
  );
};

module.exports = { generateAccessToken, generateRefreshToken };
