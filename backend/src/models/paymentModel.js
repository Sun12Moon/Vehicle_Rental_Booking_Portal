const db = require('../config/db');
const store = require('./store');

const paymentModel = {
  createPayment: async (paymentData) => {
    const {
      bookingId,
      transactionReference,
      paymentMethod = 'UPI',
      amount,
      paymentStatus = 'PENDING',
      paymentGateway = 'Razorpay',
      gatewayResponse = '{}'
    } = paymentData;

    if (db.getStatus().isConnected) {
      const sql = `
        INSERT INTO payments (
          booking_id, transaction_reference, payment_method, amount,
          payment_status, payment_gateway, gateway_response, payment_date,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ${paymentStatus === 'COMPLETED' ? 'NOW()' : 'NULL'}, NOW(), NOW())
      `;
      const res = await db.query(sql, [
        bookingId, transactionReference, paymentMethod, amount,
        paymentStatus, paymentGateway, gatewayResponse
      ]);
      return res.insertId;
    }

    const newId = store.payments.length ? Math.max(...store.payments.map(p => p.payment_id)) + 1 : 1;
    const newPayment = {
      payment_id: newId,
      booking_id: Number(bookingId),
      transaction_reference: transactionReference,
      payment_method: paymentMethod,
      amount: Number(amount),
      payment_status: paymentStatus,
      payment_gateway: paymentGateway,
      payment_date: paymentStatus === 'COMPLETED' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null,
      gateway_response: gatewayResponse
    };
    store.payments.push(newPayment);
    return newId;
  },

  getPaymentByBookingId: async (bookingId) => {
    if (db.getStatus().isConnected) {
      const rows = await db.query('SELECT * FROM payments WHERE booking_id = ? LIMIT 1', [Number(bookingId)]);
      return rows[0] || null;
    }
    return store.payments.find(payment => payment.booking_id === Number(bookingId)) || null;
  },

  updatePaymentByBookingId: async (bookingId, fields) => {
    const {
      transactionReference,
      paymentMethod,
      amount,
      paymentStatus,
      gatewayResponse,
      paymentDate = false
    } = fields;
    if (db.getStatus().isConnected) {
      await db.query(
        `UPDATE payments SET transaction_reference = ?, payment_method = ?, amount = ?,
         payment_status = ?, gateway_response = ?, payment_date = ${paymentDate ? 'NOW()' : 'NULL'},
         updated_at = NOW() WHERE booking_id = ?`,
        [transactionReference, paymentMethod, amount, paymentStatus, gatewayResponse, Number(bookingId)]
      );
      return paymentModel.getPaymentByBookingId(bookingId);
    }
    const payment = store.payments.find(item => item.booking_id === Number(bookingId));
    if (!payment) return null;
    Object.assign(payment, {
      transaction_reference: transactionReference,
      payment_method: paymentMethod,
      amount: Number(amount),
      payment_status: paymentStatus,
      gateway_response: gatewayResponse,
      payment_date: paymentDate ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null
    });
    return payment;
  },

  createInvoice: async (invoiceData) => {
    const {
      paymentId,
      invoiceNumber,
      subtotal,
      taxAmount,
      totalAmount,
      pdfPath = null
    } = invoiceData;

    if (db.getStatus().isConnected) {
      const sql = `
        INSERT INTO invoices (
          payment_id, invoice_number, invoice_date, subtotal, tax_amount, total_amount, pdf_path,
          created_at, updated_at
        ) VALUES (?, ?, NOW(), ?, ?, ?, ?, NOW(), NOW())
      `;
      const res = await db.query(sql, [
        paymentId, invoiceNumber, subtotal, taxAmount, totalAmount, pdfPath
      ]);
      return res.insertId;
    }

    const newId = store.invoices.length ? Math.max(...store.invoices.map(i => i.invoice_id)) + 1 : 1;
    const newInvoice = {
      invoice_id: newId,
      payment_id: Number(paymentId),
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
      subtotal: Number(subtotal),
      tax_amount: Number(taxAmount),
      total_amount: Number(totalAmount),
      pdf_path: pdfPath || `/invoices/${invoiceNumber}.pdf`
    };
    store.invoices.push(newInvoice);
    return newId;
  },

  getInvoiceByBookingId: async (bookingId) => {
    const bId = Number(bookingId);
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT inv.*, p.transaction_reference, p.payment_method, p.payment_date,
               b.booking_reference, b.pickup_date, b.return_date, b.total_days, b.daily_rent, b.security_deposit,
               v.brand, v.model, v.registration_number,
               cp.first_name, cp.last_name, cp.phone, cp.address, cp.city, cp.state, cp.postal_code,
               u.email as customer_email
        FROM invoices inv
        JOIN payments p ON inv.payment_id = p.payment_id
        JOIN bookings b ON p.booking_id = b.booking_id
        JOIN vehicles v ON b.vehicle_id = v.vehicle_id
        JOIN customer_profiles cp ON b.customer_id = cp.customer_id
        JOIN users u ON cp.user_id = u.user_id
        WHERE b.booking_id = ?
        LIMIT 1
      `;
      const rows = await db.query(sql, [bId]);
      return rows[0] || null;
    }

    const p = store.payments.find(item => item.booking_id === bId);
    if (!p) return null;
    const inv = store.invoices.find(item => item.payment_id === p.payment_id);
    if (!inv) return null;
    const b = store.bookings.find(item => item.booking_id === bId) || {};
    const v = store.vehicles.find(item => item.vehicle_id === b.vehicle_id) || {};
    const cp = store.customer_profiles.find(item => item.customer_id === b.customer_id) || {};
    const u = store.users.find(item => item.user_id === cp.user_id) || {};

    return {
      ...inv,
      transaction_reference: p.transaction_reference,
      payment_method: p.payment_method,
      payment_date: p.payment_date,
      booking_reference: b.booking_reference,
      pickup_date: b.pickup_date,
      return_date: b.return_date,
      total_days: b.total_days,
      daily_rent: b.daily_rent,
      security_deposit: b.security_deposit,
      brand: v.brand,
      model: v.model,
      registration_number: v.registration_number,
      customer_name: `${cp.first_name || ''} ${cp.last_name || ''}`.trim(),
      customer_email: u.email,
      customer_phone: cp.phone,
      address: cp.address,
      city: cp.city,
      state: cp.state,
      postal_code: cp.postal_code
    };
  },

  getAllPayments: async () => {
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT p.*, b.booking_reference, cp.first_name, cp.last_name, u.email as customer_email
        FROM payments p
        JOIN bookings b ON p.booking_id = b.booking_id
        JOIN customer_profiles cp ON b.customer_id = cp.customer_id
        JOIN users u ON cp.user_id = u.user_id
        ORDER BY p.payment_date DESC
      `;
      return await db.query(sql);
    }

    return store.payments
      .map(p => {
        const b = store.bookings.find(item => item.booking_id === p.booking_id) || {};
        const cp = store.customer_profiles.find(item => item.customer_id === b.customer_id) || {};
        const u = store.users.find(item => item.user_id === cp.user_id) || {};
        return {
          ...p,
          booking_reference: b.booking_reference || 'N/A',
          customer_name: `${cp.first_name || ''} ${cp.last_name || ''}`.trim() || 'Customer',
          customer_email: u.email || ''
        };
      })
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  }
};

module.exports = paymentModel;
