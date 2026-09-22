const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');

const router = express.Router();

// Check dates availability
router.get('/check-availability', bookingController.checkAvailability);

// Protected booking actions
router.post(
  '/',
  authenticateToken,
  [
    body('vehicleId').notEmpty().withMessage('Vehicle ID is required'),
    body('pickupDate').notEmpty().withMessage('Pickup date is required'),
    body('returnDate').notEmpty().withMessage('Return date is required'),
    validate
  ],
  bookingController.createBooking
);

router.get('/my-bookings', authenticateToken, bookingController.getMyBookings);
router.get('/:id', authenticateToken, bookingController.getBookingDetails);
router.patch('/:id/cancel', authenticateToken, bookingController.cancelBooking);

module.exports = router;
