const db = require('../config/db');
const store = require('./store');

const maintenanceModel = {
  getAllRecords: async () => {
    if (db.getStatus().isConnected) {
      const sql = `
        SELECT m.*, v.brand, v.model, v.registration_number
        FROM maintenance_records m
        JOIN vehicles v ON m.vehicle_id = v.vehicle_id
        ORDER BY m.service_date DESC
      `;
      return await db.query(sql);
    }

    return store.maintenance_records.map(m => {
      const v = store.vehicles.find(item => item.vehicle_id === m.vehicle_id) || {};
      return {
        ...m,
        brand: v.brand || 'Fleet',
        model: v.model || 'Vehicle',
        registration_number: v.registration_number || 'N/A'
      };
    });
  },

  createRecord: async (data) => {
    const {
      vehicleId,
      serviceDate,
      serviceType,
      serviceCenter = '',
      odometerReading = 0,
      serviceCost = 0,
      nextServiceDue = null,
      remarks = ''
    } = data;

    if (db.getStatus().isConnected) {
      const sql = `
        INSERT INTO maintenance_records (
          vehicle_id, service_date, service_type, service_center,
          odometer_reading, service_cost, next_service_due, remarks, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      const res = await db.query(sql, [
        vehicleId, serviceDate, serviceType, serviceCenter,
        odometerReading, serviceCost, nextServiceDue, remarks
      ]);
      return res.insertId;
    }

    const newId = store.maintenance_records.length ? Math.max(...store.maintenance_records.map(m => m.maintenance_id)) + 1 : 1;
    const newRecord = {
      maintenance_id: newId,
      vehicle_id: Number(vehicleId),
      service_date: serviceDate,
      service_type: serviceType,
      service_center: serviceCenter,
      odometer_reading: odometerReading,
      service_cost: Number(serviceCost),
      next_service_due: nextServiceDue,
      remarks
    };
    store.maintenance_records.push(newRecord);
    return newId;
  }
};

module.exports = maintenanceModel;
