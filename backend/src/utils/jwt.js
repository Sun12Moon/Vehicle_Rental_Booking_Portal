const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rentivo_super_secret_jwt_key_2026_production_grade';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  signToken,
  verifyToken
};
