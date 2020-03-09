const jwt = require('jsonwebtoken');

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
}

function generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
    });
  }

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
};
