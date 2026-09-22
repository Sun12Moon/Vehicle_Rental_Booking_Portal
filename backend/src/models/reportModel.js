const db = require('../config/db');
const store = require('./store');

const reportModel = {
  getDashboardStats: async () => {
    if (db.getStatus().isConnected) {
      const fleetSql = `
        SELECT 
          COUNT(vehicle_id) as total_vehicles,
          SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_vehicles,
          SUM(CASE WHEN status = 'RENTED' THEN 1 ELSE 0 END) as rented_vehicles,
          SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance_vehicles
        FROM vehicles
        WHERE deleted_at IS NULL
      `;
      const [fleetRows] = await db.query(fleetSql);

      const revSql = `SELECT COALESCE(SUM(amount), 0) as total_revenue FROM payments WHERE payment_status = 'COMPLETED'`;
      const [revRows] = await db.query(revSql);

      const custSql = `SELECT COUNT(*) as active_customers FROM users WHERE role_id = 2 AND status = 'ACTIVE'`;
      const [custRows] = await db.query(custSql);

      const recentBookingsSql = `
        SELECT b.*, v.brand, v.model, cp.first_name, cp.last_name, p.payment_status
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.vehicle_id
        JOIN customer_profiles cp ON b.customer_id = cp.customer_id
        LEFT JOIN payments p ON b.booking_id = p.booking_id
        ORDER BY b.booking_date DESC
        LIMIT 5
      `;
      const recentBookings = await db.query(recentBookingsSql);

      const totalVehicles = fleetRows ? Number(fleetRows.total_vehicles) : 0;
      const rentedVehicles = fleetRows ? Number(fleetRows.rented_vehicles) : 0;

      return {
        totalVehicles,
        availableVehicles: fleetRows ? Number(fleetRows.available_vehicles) : 0,
        rentedVehicles,
        maintenanceVehicles: fleetRows ? Number(fleetRows.maintenance_vehicles) : 0,
        totalRevenue: revRows ? Number(revRows.total_revenue) : 0,
        activeCustomersCount: custRows ? Number(custRows.active_customers) : 0,
        utilizationPercent: totalVehicles ? Math.round((rentedVehicles / totalVehicles) * 100) : 0,
        recentBookings
      };
    }

    // Memory Store Fallback
    const totalVehicles = store.vehicles.length;
    const availableVehicles = store.vehicles.filter(v => v.status === 'AVAILABLE').length;
    const rentedVehicles = store.vehicles.filter(v => v.status === 'RENTED').length;
    const maintenanceVehicles = store.vehicles.filter(v => v.status === 'MAINTENANCE').length;
    const totalRevenue = store.payments
      .filter(p => p.payment_status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const activeCustomersCount = store.users.filter(u => u.role_id === 2 && u.status === 'ACTIVE').length;

    const recentBookings = store.bookings
      .slice(-5)
      .reverse()
      .map(b => {
        const v = store.vehicles.find(item => item.vehicle_id === b.vehicle_id) || {};
        const cp = store.customer_profiles.find(item => item.customer_id === b.customer_id) || {};
        const p = store.payments.find(item => item.booking_id === b.booking_id);
        return {
          ...b,
          brand: v.brand,
          model: v.model,
          customer_name: `${cp.first_name || ''} ${cp.last_name || ''}`.trim(),
          payment_status: p ? p.payment_status : 'PENDING'
        };
      });

    return {
      totalVehicles,
      availableVehicles,
      rentedVehicles,
      maintenanceVehicles,
      totalRevenue,
      activeCustomersCount,
      utilizationPercent: totalVehicles ? Math.round((rentedVehicles / totalVehicles) * 100) : 0,
      recentBookings
    };
  },

  getReports: async (type = 'bookings') => {
    // Generate aggregated dataset for export and analytics
    if (type === 'revenue') {
      return store.bookings.map(b => {
        const p = store.payments.find(item => item.booking_id === b.booking_id);
        return {
          reference: b.booking_reference,
          pickup_date: b.pickup_date,
          return_date: b.return_date,
          subtotal: b.daily_rent * b.total_days,
          tax: b.tax,
          total: b.total_amount,
          payment_method: p ? p.payment_method : 'N/A',
          status: p ? p.payment_status : 'PENDING'
        };
      });
    }

    if (type === 'customers') {
      return store.users
        .filter(u => u.role_id === 2)
        .map(u => {
          const cp = store.customer_profiles.find(p => p.user_id === u.user_id) || {};
          const bookingsCount = store.bookings.filter(b => b.customer_id === cp.customer_id).length;
          return {
            name: `${cp.first_name || ''} ${cp.last_name || ''}`.trim() || u.email,
            email: u.email,
            phone: cp.phone || 'N/A',
            city: cp.city || 'N/A',
            status: u.status,
            total_bookings: bookingsCount
          };
        });
    }

    if (type === 'vehicles') {
      return store.vehicles.map(v => {
        const cat = store.vehicle_categories.find(c => c.category_id === v.category_id);
        const br = store.branches.find(b => b.branch_id === v.branch_id);
        return {
          vehicle: `${v.brand} ${v.model}`,
          registration: v.registration_number,
          category: cat ? cat.category_name : 'Standard',
          branch: br ? br.branch_name : 'Main',
          daily_rent: v.daily_rent,
          status: v.status
        };
      });
    }

    // Default: Bookings
    return store.bookings.map(b => {
      const v = store.vehicles.find(item => item.vehicle_id === b.vehicle_id) || {};
      const cp = store.customer_profiles.find(item => item.customer_id === b.customer_id) || {};
      return {
        reference: b.booking_reference,
        customer: `${cp.first_name || ''} ${cp.last_name || ''}`.trim() || 'Customer',
        vehicle: `${v.brand} ${v.model}`,
        pickup_date: b.pickup_date,
        return_date: b.return_date,
        total: b.total_amount,
        status: b.booking_status
      };
    });
  }
};

module.exports = reportModel;
