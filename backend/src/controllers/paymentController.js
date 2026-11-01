const paymentModel = require('../models/paymentModel');
const bookingModel = require('../models/bookingModel');
const userModel = require('../models/userModel');
const razorpayService = require('../services/razorpayService');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const getOwnedBooking = async (req, bookingId) => {
  const booking = await bookingModel.getBookingById(bookingId);
  if (!booking) return { error: 'Booking not found.', status: 404 };
  const user = await userModel.findById(req.user.userId);
  if (!user || Number(booking.customer_id) !== Number(user.customer_id)) {
    return { error: 'Booking not found.', status: 404 };
  }
  return { booking, user };
};

const parseGatewayResponse = (value) => {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
};

const ensureInvoice = async (bookingId, booking, paymentId) => {
  const refreshed = await bookingModel.getBookingById(bookingId);
  if (refreshed?.invoice_id) return refreshed.invoice_number;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(bookingId).padStart(4, '0')}`;
  await paymentModel.createInvoice({
    paymentId,
    invoiceNumber,
    subtotal: Number(booking.daily_rent) * Number(booking.total_days) - Number(booking.discount || 0),
    taxAmount: Number(booking.tax || 0),
    totalAmount: Number(booking.total_amount),
    pdfPath: `/invoices/${invoiceNumber}.pdf`
  });
  return invoiceNumber;
};

const paymentController = {
  createRazorpayOrder: async (req, res, next) => {
    try {
      const credentials = razorpayService.getTestCredentials();
      if (!credentials) {
        return errorResponse(res, 503, 'Razorpay test mode is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env.');
      }

      const { bookingId } = req.body;
      const owned = await getOwnedBooking(req, bookingId);
      if (owned.error) return errorResponse(res, owned.status, owned.error);
      const { booking } = owned;
      if (booking.booking_status !== 'PENDING') {
        return errorResponse(res, 409, 'This booking is no longer awaiting payment.');
      }
      if (!(Number(booking.total_amount) > 0)) {
        return errorResponse(res, 400, 'Booking total is invalid.');
      }

      const existing = await paymentModel.getPaymentByBookingId(bookingId);
      if (existing?.payment_status === 'COMPLETED') {
        return errorResponse(res, 409, 'This booking has already been paid.');
      }

      const amount = Math.round(Number(booking.total_amount) * 100);
      const order = await razorpayService.createOrder({
        amount,
        currency: 'INR',
        receipt: String(booking.booking_reference || `booking_${bookingId}`).slice(0, 40),
        notes: { booking_id: String(bookingId) }
      }, credentials);
      if (!order?.id || Number(order.amount) !== amount || order.currency !== 'INR') {
        const error = new Error('Razorpay returned an order that does not match the booking.');
        error.statusCode = 502;
        throw error;
      }

      const paymentRecord = {
        bookingId: Number(bookingId),
        transactionReference: order.id,
        paymentMethod: 'UPI',
        amount: Number(booking.total_amount),
        paymentStatus: 'PENDING',
        paymentGateway: 'Razorpay Test Mode',
        gatewayResponse: JSON.stringify({ order_id: order.id })
      };
      if (existing) {
        await paymentModel.updatePaymentByBookingId(bookingId, paymentRecord);
      } else {
        await paymentModel.createPayment(paymentRecord);
      }

      return successResponse(res, 201, 'Razorpay test order created', {
        keyId: credentials.keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        bookingId: Number(bookingId),
        bookingReference: booking.booking_reference
      });
    } catch (err) {
      next(err);
    }
  },

  verifyRazorpayPayment: async (req, res, next) => {
    try {
      const credentials = razorpayService.getTestCredentials();
      if (!credentials) {
        return errorResponse(res, 503, 'Razorpay test mode is not configured.');
      }
      const { bookingId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
      if (!bookingId || !orderId || !paymentId || !signature) {
        return errorResponse(res, 400, 'Booking and Razorpay payment details are required.');
      }

      const owned = await getOwnedBooking(req, bookingId);
      if (owned.error) return errorResponse(res, owned.status, owned.error);
      const { booking } = owned;
      const payment = await paymentModel.getPaymentByBookingId(bookingId);
      const savedGatewayData = parseGatewayResponse(payment?.gateway_response);

      if (payment?.payment_status === 'COMPLETED') {
        if (payment.transaction_reference === paymentId && savedGatewayData.order_id === orderId) {
          if (booking.booking_status !== 'CONFIRMED') {
            await bookingModel.updateBookingStatus(bookingId, 'CONFIRMED', 'Razorpay test payment captured', req.user.userId);
          }
          const invoiceNumber = await ensureInvoice(bookingId, booking, payment.payment_id);
          const confirmed = await bookingModel.getBookingById(bookingId);
          return successResponse(res, 200, 'Payment was already verified', {
            bookingId: Number(bookingId),
            transactionReference: paymentId,
            paymentMethod: payment.payment_method,
            invoiceNumber: confirmed.invoice_number || invoiceNumber,
            amount: Number(booking.total_amount),
            status: 'COMPLETED'
          });
        }
        return errorResponse(res, 409, 'This booking has already been paid.');
      }

      if (!payment || payment.payment_status !== 'PENDING' || payment.transaction_reference !== orderId || savedGatewayData.order_id !== orderId) {
        return errorResponse(res, 400, 'Razorpay order does not match this booking.');
      }
      if (!razorpayService.verifyCheckoutSignature({ orderId, paymentId, signature, secret: credentials.keySecret })) {
        return errorResponse(res, 400, 'Razorpay payment signature is invalid.');
      }

      const expectedAmount = Math.round(Number(booking.total_amount) * 100);
      let gatewayPayment = await razorpayService.fetchPayment(paymentId, credentials);
      if (gatewayPayment.order_id !== orderId || Number(gatewayPayment.amount) !== expectedAmount || gatewayPayment.currency !== 'INR') {
        return errorResponse(res, 400, 'Razorpay payment does not match the booking amount.');
      }
      if (gatewayPayment.status === 'authorized') {
        gatewayPayment = await razorpayService.capturePayment(paymentId, expectedAmount, 'INR', credentials);
      }
      if (gatewayPayment.status !== 'captured') {
        return errorResponse(res, 409, 'Razorpay has not captured this payment. The booking remains pending.');
      }

      const methodMap = { upi: 'UPI', card: 'CARD', netbanking: 'NET_BANKING', wallet: 'WALLET' };
      const paymentMethod = methodMap[String(gatewayPayment.method || '').toLowerCase()] || 'UPI';
      const gatewayResponse = JSON.stringify({
        order_id: orderId,
        payment_id: paymentId,
        method: gatewayPayment.method,
        status: gatewayPayment.status,
        amount: gatewayPayment.amount,
        currency: gatewayPayment.currency
      });
      const completedPayment = await paymentModel.updatePaymentByBookingId(bookingId, {
        transactionReference: paymentId,
        paymentMethod,
        amount: Number(booking.total_amount),
        paymentStatus: 'COMPLETED',
        gatewayResponse,
        paymentDate: true
      });
      await bookingModel.updateBookingStatus(bookingId, 'CONFIRMED', 'Razorpay test payment captured', req.user.userId);

      const invoiceNumber = await ensureInvoice(bookingId, booking, completedPayment.payment_id);
      const confirmed = await bookingModel.getBookingById(bookingId);

      return successResponse(res, 200, 'Razorpay test payment verified and booking confirmed', {
        bookingId: Number(bookingId),
        transactionReference: paymentId,
        paymentMethod,
        invoiceNumber,
        invoiceId: confirmed.invoice_id,
        amount: Number(booking.total_amount),
        status: 'COMPLETED'
      });
    } catch (err) {
      next(err);
    }
  },

  processPayment: async (_req, res) => {
    return errorResponse(res, 410, 'Use the Razorpay order and verification endpoints to process payments.');
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
