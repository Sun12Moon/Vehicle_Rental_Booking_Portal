const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

const router = express.Router();

// All admin routes require valid authentication and ADMIN role
router.use(authenticateToken, requireAdmin);

router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/bookings', adminController.getAllBookings);
router.patch('/bookings/:id/status', adminController.updateBookingStatus);
router.get('/customers', adminController.getAllCustomers);
router.get('/maintenance', adminController.getMaintenanceRecords);
router.post('/maintenance', adminController.createMaintenanceRecord);
router.get('/reports', adminController.getReports);

module.exports = router;
