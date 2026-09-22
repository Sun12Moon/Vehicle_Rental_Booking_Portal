const { errorResponse } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  return errorResponse(res, statusCode, message, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = {
  errorHandler
};
