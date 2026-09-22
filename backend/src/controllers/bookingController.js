const bookingModel = require('../models/bookingModel');
const vehicleModel = require('../models/vehicleModel');
const paymentModel = require('../models/paymentModel');
const userModel = require('../models/userModel');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const bookingController = {
  checkAvailability: async (req, res, next) => {
    try {
      const { vehicleId, pickupDate, returnDate } = req.query;
      if (!vehicleId || !pickupDate || !returnDate) {
        return errorResponse(res, 400, 'vehicleId, pickupDate, and returnDate are required.');
      }

      const { isAvailable, conflicts } = await bookingModel.checkAvailability(vehicleId, pickupDate, returnDate);
      return successResponse(res, 200, isAvailable ? 'Vehicle is available.' : 'Vehicle is already booked.', {
        isAvailable,
        conflictsCount: conflicts.length
      });
    } catch (err) {
      next(err);
    }
  },

  createBooking: async (req, res, next) => {
    try {
      const {
        vehicleId,
        pickupDate,
        returnDate,
        pickupLocation,
        returnLocation,
        promoCode,
        paymentMethod = 'UPI',
        remarks = ''
      } = req.body;

      if (!vehicleId || !pickupDate || !returnDate) {
        return errorResponse(res, 400, 'vehicleId, pickupDate, and returnDate are required.');
      }

      if (returnDate <= pickupDate) {
        return errorResponse(res, 400, 'Return date must be strictly after the pickup date.');
      }

      const vehicle = await vehicleModel.findById(vehicleId);
      if (!vehicle) {
        return errorResponse(res, 404, 'Selected vehicle not found.');
      }

      // CRITICAL FR7: Check concurrent booking overlap
      const availability = await bookingModel.checkAvailability(vehicleId, pickupDate, returnDate);
      if (!availability.isAvailable) {
        return errorResponse(
          res,
          409,
          'Vehicle is unavailable. Another reservation overlaps with your selected rental dates. Please choose different dates or another vehicle.',
          { conflicts: availability.conflicts }
        );
      }

      // Resolve customer ID
      let customerId = req.user?.customerId;
      if (!customerId && req.user?.userId) {
        const user = await userModel.findById(req.user.userId);
        customerId = user?.customer_id;
      }
      if (!customerId) {
        customerId = 2; // Default fallback to active customer
      }

      // Calculate days & pricing
      const pickupTime = new Date(pickupDate).getTime();
      const returnTime = new Date(returnDate).getTime();
      const totalDays = Math.max(1, Math.ceil((returnTime - pickupTime) / (1000 * 60 * 60 * 24)));

      const dailyRent = Number(vehicle.daily_rent);
      const securityDeposit = Number(vehicle.security_deposit || 7500);
      let subtotal = dailyRent * totalDays;
      let discount = 0;

      if (promoCode && promoCode.toUpperCase() === 'WEEKEND15' && totalDays >= 2) {
        discount = Math.round(subtotal * 0.15);
      }

      const taxableAmount = subtotal - discount;
      const tax = Math.round(taxableAmount * 0.18); // 18% GST standard
      const totalAmount = taxableAmount + tax + securityDeposit;

      // 1. Create Booking Record
      const booking = await bookingModel.createBooking({
        customerId,
        vehicleId: Number(vehicleId),
        pickupDate,
        returnDate,
        pickupLocation: pickupLocation || vehicle.branch_name || 'Main Branch',
        returnLocation: returnLocation || pickupLocation || vehicle.branch_name || 'Main Branch',
        bookingStatus: 'CONFIRMED',
        totalDays,
        dailyRent,
        securityDeposit,
        discount,
        tax,
        totalAmount,
        remarks
      });

      // 2. Automated Payment & Invoice Generation (FR8, FR9)
      const transactionRef = `pay_${Math.random().toString(36).slice(2, 11)}`;
      const paymentId = await paymentModel.createPayment({
        bookingId: booking.booking_id,
        transactionReference: transactionRef,
        paymentMethod,
        amount: totalAmount,
        paymentStatus: 'COMPLETED',
        paymentGateway: 'Razorpay',
        gatewayResponse: JSON.stringify({ status: 'captured', transactionId: transactionRef })
      });

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(booking.booking_id).padStart(4, '0')}`;
      const invoiceId = await paymentModel.createInvoice({
        paymentId,
        invoiceNumber,
        subtotal,
        taxAmount: tax,
        totalAmount,
        pdfPath: `/invoices/${invoiceNumber}.pdf`
      });

      const completeBooking = await bookingModel.getBookingById(booking.booking_id);

      return successResponse(res, 201, 'Vehicle booked and confirmed successfully', {
        booking: completeBooking,
        invoice: {
          invoiceId,
          invoiceNumber,
          totalAmount,
          subtotal,
          taxAmount: tax,
          securityDeposit
        }
      });
    } catch (err) {
      next(err);
    }
  },

  getMyBookings: async (req, res, next) => {
    try {
      let customerId = req.user?.customerId;
      if (!customerId && req.user?.userId) {
        const user = await userModel.findById(req.user.userId);
        customerId = user?.customer_id;
      }
      if (!customerId) customerId = 2;

      const bookings = await bookingModel.getUserBookings(customerId);
      return successResponse(res, 200, 'Customer bookings retrieved', bookings);
    } catch (err) {
      next(err);
    }
  },

  getBookingDetails: async (req, res, next) => {
    try {
      const booking = await bookingModel.getBookingById(req.params.id);
      if (!booking) {
        return errorResponse(res, 404, 'Booking not found.');
      }
      return successResponse(res, 200, 'Booking details retrieved', booking);
    } catch (err) {
      next(err);
    }
  },

  cancelBooking: async (req, res, next) => {
    try {
      const { reason = 'Cancelled by user' } = req.body;
      const updated = await bookingModel.updateBookingStatus(
        req.params.id,
        'CANCELLED',
        reason,
        req.user?.userId || null
      );
      if (!updated) {
        return errorResponse(res, 404, 'Booking not found.');
      }
      return successResponse(res, 200, 'Booking cancelled successfully', updated);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = bookingController;
