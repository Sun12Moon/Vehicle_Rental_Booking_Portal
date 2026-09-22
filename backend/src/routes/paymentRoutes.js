const express = require('express');
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validate');

const router = express.Router();

router.post(
  '/process',
  authenticateToken,
  [
    body('bookingId').notEmpty().withMessage('Booking ID is required'),
    validate
  ],
  paymentController.processPayment
);

router.get('/invoice/:bookingId', authenticateToken, paymentController.getInvoice);
router.get('/all', authenticateToken, requireAdmin, paymentController.getAllPayments);

module.exports = router;
