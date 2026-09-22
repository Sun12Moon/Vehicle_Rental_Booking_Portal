const paymentModel = require('../models/paymentModel');
const bookingModel = require('../models/bookingModel');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const paymentController = {
  processPayment: async (req, res, next) => {
    try {
      const {
        bookingId,
        paymentMethod = 'UPI',
        amount,
        paymentGateway = 'Razorpay'
      } = req.body;

      const booking = await bookingModel.getBookingById(bookingId);
      if (!booking) {
        return errorResponse(res, 404, 'Booking not found.');
      }

      const transactionReference = `pay_${Math.random().toString(36).slice(2, 11)}`;
      const payableAmount = amount || booking.total_amount;

      const paymentId = await paymentModel.createPayment({
        bookingId: Number(bookingId),
        transactionReference,
        paymentMethod,
        amount: payableAmount,
        paymentStatus: 'COMPLETED',
        paymentGateway,
        gatewayResponse: JSON.stringify({ status: 'captured', reference: transactionReference })
      });

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(bookingId).padStart(4, '0')}`;
      const subtotal = booking.daily_rent * booking.total_days;
      const taxAmount = booking.tax || Math.round(subtotal * 0.18);

      const invoiceId = await paymentModel.createInvoice({
        paymentId,
        invoiceNumber,
        subtotal,
        taxAmount,
        totalAmount: payableAmount,
        pdfPath: `/invoices/${invoiceNumber}.pdf`
      });

      await bookingModel.updateBookingStatus(bookingId, 'CONFIRMED', 'Payment captured via ' + paymentMethod);

      return successResponse(res, 201, 'Payment processed and invoice generated successfully', {
        paymentId,
        transactionReference,
        invoiceNumber,
        invoiceId,
        amount: payableAmount,
        status: 'COMPLETED'
      });
    } catch (err) {
      next(err);
    }
  },

  getInvoice: async (req, res, next) => {
    try {
      const invoice = await paymentModel.getInvoiceByBookingId(req.params.bookingId);
      if (!invoice) {
        return errorResponse(res, 404, 'Invoice not found for this booking.');
      }
      return successResponse(res, 200, 'Invoice retrieved successfully', invoice);
    } catch (err) {
      next(err);
    }
  },

  getAllPayments: async (req, res, next) => {
    try {
      const payments = await paymentModel.getAllPayments();
      return successResponse(res, 200, 'Payments list retrieved', payments);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = paymentController;
