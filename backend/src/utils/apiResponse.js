/**
 * Standard API Response Utility
 * Adheres to Engineering Standards
 */

const successResponse = (res, statusCode = 200, message = 'Success', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, statusCode = 500, message = 'An error occurred', error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: error || {}
  });
};

module.exports = {
  successResponse,
  errorResponse
};
