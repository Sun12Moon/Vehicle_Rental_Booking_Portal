const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/apiResponse');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return errorResponse(res, 401, 'Access denied. Authentication token required.');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return errorResponse(res, 401, 'Invalid or expired authentication token.');
  }

  req.user = decoded;
  next();
};

module.exports = {
  authenticateToken
};
