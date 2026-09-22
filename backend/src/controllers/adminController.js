const reportModel = require('../models/reportModel');
const bookingModel = require('../models/bookingModel');
const userModel = require('../models/userModel');
const maintenanceModel = require('../models/maintenanceModel');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const adminController = {
  getDashboardStats: async (req, res, next) => {
    try {
      const stats = await reportModel.getDashboardStats();
      return successResponse(res, 200, 'Admin dashboard statistics retrieved', stats);
    } catch (err) {
      next(err);
    }
  },

  getAllBookings: async (req, res, next) => {
    try {
      const filters = {
        status: req.query.status,
        search: req.query.search
      };
      const bookings = await bookingModel.getAllBookings(filters);
      return successResponse(res, 200, 'Admin bookings retrieved', bookings);
    } catch (err) {
      next(err);
    }
  },

  updateBookingStatus: async (req, res, next) => {
    try {
      const { status, remarks = '' } = req.body;
      if (!status) {
        return errorResponse(res, 400, 'Status is required.');
      }

      const updated = await bookingModel.updateBookingStatus(
        req.params.id,
        status,
        remarks,
        req.user?.userId || 1
      );

      if (!updated) {
        return errorResponse(res, 404, 'Booking not found to update.');
      }

      return successResponse(res, 200, `Booking status updated to ${status}`, updated);
    } catch (err) {
      next(err);
    }
  },

  getAllCustomers: async (req, res, next) => {
    try {
      const customers = await userModel.getAllCustomers();
      return successResponse(res, 200, 'Registered customers retrieved', customers);
    } catch (err) {
      next(err);
    }
  },

  getMaintenanceRecords: async (req, res, next) => {
    try {
      const records = await maintenanceModel.getAllRecords();
      return successResponse(res, 200, 'Maintenance logs retrieved', records);
    } catch (err) {
      next(err);
    }
  },

  createMaintenanceRecord: async (req, res, next) => {
    try {
      const recordId = await maintenanceModel.createRecord(req.body);
      return successResponse(res, 201, 'Maintenance service logged successfully', { recordId });
    } catch (err) {
      next(err);
    }
  },

  getReports: async (req, res, next) => {
    try {
      const { type = 'bookings' } = req.query;
      const data = await reportModel.getReports(type);
      return successResponse(res, 200, `${type} report generated`, data);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = adminController;
