const express = require('express');
const authRoutes = require('./authRoutes');
const vehicleRoutes = require('./vehicleRoutes');
const bookingRoutes = require('./bookingRoutes');
const paymentRoutes = require('./paymentRoutes');
const branchRoutes = require('./branchRoutes');
const adminRoutes = require('./adminRoutes');
const kycRoutes = require('./kycRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/branches', branchRoutes);
router.use('/admin', adminRoutes);
router.use('/kyc', kycRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Vehicle Rental Booking Portal API is healthy and running.',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
