const { errorResponse } = require('../utils/apiResponse');

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 401, 'Unauthorized. Please login.');
    }

    const userRole = String(req.user.role).toUpperCase();
    const isAllowed = allowedRoles.map(r => r.toUpperCase()).includes(userRole);

    if (!isAllowed) {
      return errorResponse(res, 403, 'Forbidden. Insufficient permissions.');
    }

    next();
  };
};

const requireAdmin = requireRole('ADMIN');
const requireCustomer = requireRole('CUSTOMER', 'ADMIN');

module.exports = {
  requireRole,
  requireAdmin,
  requireCustomer
};
