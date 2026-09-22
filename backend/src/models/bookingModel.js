const db = require('../config/db');
const store = require('./store');

const bookingModel = {
  /**
   * Concurrency & Availability Validation (FR7)
   * Checks whether the requested vehicle is already reserved for overlapping dates
   */
  checkAvailability: async (vehicleId, pickupDate, returnDate, excludeBookingId = null) => {
    const vId = Number(vehicleId);

    if (db.getStatus().isConnected) {
      let sql = `
        SELECT booking_id, booking_reference, pickup_date, return_date, booking_status
        FROM bookings
        WHERE vehicle_id = ?
          AND booking_status IN ('CONFIRMED', 'ACTIVE')
          AND (pickup_date <= ? AND return_date >= ?)
      `;
      const params = [vId, returnDate, pickupDate];

      if (excludeBookingId) {
        sql += ` AND booking_id != ?`;
        params.push(Number(excludeBookingId));
      }

      sql += ` FOR UPDATE`;
      const conflicts = await db.query(sql, params);
      return {
        isAvailable: conflicts.length === 0,
        conflicts
      };
    }

    // Memory Store Fallback
    const conflicts = store.bookings.filter(b => {
      if (b.vehicle_id !== vId) return false;
      if (!['CONFIRMED', 'ACTIVE'].includes(b.booking_status)) return false;
      if (excludeBookingId && b.booking_id === Number(excludeBookingId)) return false;

      // Overlap: existing.pickup <= requested.return && existing.return >= requested.pickup
      return b.pickup_date <= returnDate && b.return_date >= pickupDate;
    });

    return {
      isAvailable: conflicts.length === 0,
      conflicts
    };
  },

  createBooking: async (bookingData) => {
    const {
      customerId,
      vehicleId,
      pickupDate,
      returnDate,
      pickupLocation,
      returnLocation,
      bookingStatus = 'CONFIRMED',
      totalDays,
      dailyRent,
      securityDeposit,
      discount = 0,
      tax,
      totalAmount,
      remarks = ''
    } = bookingData;

    const bookingReference = `RNT-${Math.floor(100000 + Math.random() * 900000)}`;

    if (db.getStatus().isConnected) {
      const sql = `
        INSERT INTO bookings (
          customer_id, vehicle_id, booking_reference, booking_date, pickup_date,
          return_date, pickup_location, return_location, booking_status,
          total_days, daily_rent, security_deposit, discount, tax, total_amount,
          remarks, created_at, updated_at
        ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      const res = await db.query(sql, [
        customerId, vehicleId, bookingReference, pickupDate, returnDate,
        pickupLocation, returnLocation, bookingStatus, totalDays, dailyRent,
        securityDeposit, discount, tax, totalAmount, remarks
      ]);

      const bookingId = res.insertId;

      // Insert initial history
      await db.query(
        `INSERT INTO booking_status_history (booking_id, status, changed_by, changed_at, remarks)
         VALUES (?, ?, ?, NOW(), ?)`,
        [bookingId, bookingStatus, customerId, 'Initial booking confirmation']
      );

      return bookingModel.getBookingById(bookingId);
    }

    const newId = store.bookings.length ? Math.max(...store.bookings.map(b => b.booking_id)) + 1 : 1;
    const newBooking = {
      booking_id: newId,
      customer_id: Number(customerId),
      vehicle_id: Number(vehicleId),
      booking_reference: bookingReference,
      booking_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
      pickup_date: pickupDate,
      return_date: returnDate,
      pickup_location: pickupLocation,
      return_location: returnLocation,
      booking_status: bookingStatus,
      total_days: Number(totalDays),
      daily_rent: Number(dailyRent),
      security_deposit: Number(securityDeposit),
      discount: Number(discount),
      tax: Number(tax),
      total_amount: Number(totalAmount),
      remarks
    };
    store.bookings.push(newBooking);
    return bookingModel.getBookingById(newId);
  },

  getBookingById: async (bookingId) => {
    const id = Number(bookingId);
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT b.*,
               v.brand, v.model, v.variant, v.registration_number, v.image_url,
               cp.first_name, cp.last_name, u.email as customer_email, cp.phone as customer_phone,
               p.payment_id, p.payment_status, p.payment_method, p.transaction_reference,
               inv.invoice_id, inv.invoice_number, inv.pdf_path
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.vehicle_id
        JOIN customer_profiles cp ON b.customer_id = cp.customer_id
        JOIN users u ON cp.user_id = u.user_id
        LEFT JOIN payments p ON b.booking_id = p.booking_id
        LEFT JOIN invoices inv ON p.payment_id = inv.payment_id
        WHERE b.booking_id = ?
        LIMIT 1
      `;
      const rows = await db.query(sql, [id]);
      return rows[0] || null;
    }

    const b = store.bookings.find(item => item.booking_id === id);
    if (!b) return null;
    const v = store.vehicles.find(item => item.vehicle_id === b.vehicle_id) || {};
    const cp = store.customer_profiles.find(item => item.customer_id === b.customer_id) || {};
    const u = store.users.find(item => item.user_id === cp.user_id) || {};
    const p = store.payments.find(item => item.booking_id === b.booking_id);
    const inv = p ? store.invoices.find(item => item.payment_id === p.payment_id) : null;

    return {
      ...b,
      brand: v.brand,
      model: v.model,
      variant: v.variant,
      registration_number: v.registration_number,
      image_url: v.image_url,
      first_name: cp.first_name,
      last_name: cp.last_name,
      customer_name: `${cp.first_name || ''} ${cp.last_name || ''}`.trim(),
      customer_email: u.email,
      customer_phone: cp.phone,
      payment_id: p ? p.payment_id : null,
      payment_status: p ? p.payment_status : 'PENDING',
      payment_method: p ? p.payment_method : null,
      transaction_reference: p ? p.transaction_reference : null,
      invoice_id: inv ? inv.invoice_id : null,
      invoice_number: inv ? inv.invoice_number : null,
      pdf_path: inv ? inv.pdf_path : null
    };
  },

  getUserBookings: async (customerId) => {
    const cId = Number(customerId);
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT b.*,
               v.brand, v.model, v.variant, v.image_url,
               p.payment_status, p.payment_method, p.transaction_reference,
               inv.invoice_number
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.vehicle_id
        LEFT JOIN payments p ON b.booking_id = p.booking_id
        LEFT JOIN invoices inv ON p.payment_id = inv.payment_id
        WHERE b.customer_id = ?
        ORDER BY b.booking_date DESC
      `;
      return await db.query(sql, [cId]);
    }

    return store.bookings
      .filter(b => b.customer_id === cId)
      .map(b => {
        const v = store.vehicles.find(item => item.vehicle_id === b.vehicle_id) || {};
        const p = store.payments.find(item => item.booking_id === b.booking_id);
        const inv = p ? store.invoices.find(item => item.payment_id === p.payment_id) : null;
        return {
          ...b,
          brand: v.brand,
          model: v.model,
          variant: v.variant,
          vehicle_name: `${v.brand} ${v.model}`,
          image_url: v.image_url,
          payment_status: p ? p.payment_status : 'PENDING',
          payment_method: p ? p.payment_method : null,
          transaction_reference: p ? p.transaction_reference : null,
          invoice_number: inv ? inv.invoice_number : null
        };
      })
      .sort((a, b) => new Date(b.pickup_date) - new Date(a.pickup_date));
  },

  getAllBookings: async (filters = {}) => {
    const { status, search } = filters;

    if (db.getStatus().isConnected) {
      let sql = `
        SELECT b.*,
               v.brand, v.model, v.registration_number,
               cp.first_name, cp.last_name, u.email as customer_email, cp.phone as customer_phone,
               p.payment_status, p.payment_method
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.vehicle_id
        JOIN customer_profiles cp ON b.customer_id = cp.customer_id
        JOIN users u ON cp.user_id = u.user_id
        LEFT JOIN payments p ON b.booking_id = p.booking_id
        WHERE 1=1
      `;
      const params = [];

      if (status && status !== 'All') {
        sql += ` AND b.booking_status = ?`;
        params.push(status.toUpperCase());
      }
      if (search) {
        sql += ` AND (LOWER(b.booking_reference) LIKE ? OR LOWER(cp.first_name) LIKE ? OR LOWER(cp.last_name) LIKE ? OR LOWER(u.email) LIKE ?)`;
        const q = `%${search.toLowerCase()}%`;
        params.push(q, q, q, q);
      }

      sql += ` ORDER BY b.booking_date DESC`;
      return await db.query(sql, params);
    }

    return store.bookings
      .filter(b => {
        if (status && status !== 'All' && b.booking_status.toUpperCase() !== status.toUpperCase()) return false;
        if (search) {
          const s = search.toLowerCase();
          const cp = store.customer_profiles.find(item => item.customer_id === b.customer_id) || {};
          const u = store.users.find(item => item.user_id === cp.user_id) || {};
          const match = b.booking_reference.toLowerCase().includes(s) ||
                        (cp.first_name && cp.first_name.toLowerCase().includes(s)) ||
                        (u.email && u.email.toLowerCase().includes(s));
          if (!match) return false;
        }
        return true;
      })
      .map(b => {
        const v = store.vehicles.find(item => item.vehicle_id === b.vehicle_id) || {};
        const cp = store.customer_profiles.find(item => item.customer_id === b.customer_id) || {};
        const u = store.users.find(item => item.user_id === cp.user_id) || {};
        const p = store.payments.find(item => item.booking_id === b.booking_id);
        return {
          ...b,
          brand: v.brand,
          model: v.model,
          registration_number: v.registration_number,
          first_name: cp.first_name,
          last_name: cp.last_name,
          customer_name: `${cp.first_name || ''} ${cp.last_name || ''}`.trim(),
          customer_email: u.email,
          customer_phone: cp.phone,
          payment_status: p ? p.payment_status : 'PENDING',
          payment_method: p ? p.payment_method : null
        };
      })
      .sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));
  },

  updateBookingStatus: async (bookingId, status, remarks = '', changedBy = null) => {
    const id = Number(bookingId);
    const upperStatus = status.toUpperCase();

    if (db.getStatus().isConnected) {
      const sql = `
        UPDATE bookings
        SET booking_status = ?, remarks = COALESCE(?, remarks), updated_at = NOW()
        WHERE booking_id = ?
      `;
      await db.query(sql, [upperStatus, remarks, id]);

      await db.query(
        `INSERT INTO booking_status_history (booking_id, status, changed_by, changed_at, remarks)
         VALUES (?, ?, ?, NOW(), ?)`,
        [id, upperStatus, changedBy, remarks || `Status changed to ${upperStatus}`]
      );

      return bookingModel.getBookingById(id);
    }

    const b = store.bookings.find(item => item.booking_id === id);
    if (b) {
      b.booking_status = upperStatus;
      if (remarks) b.remarks = remarks;
    }
    return bookingModel.getBookingById(id);
  }
};

module.exports = bookingModel;
