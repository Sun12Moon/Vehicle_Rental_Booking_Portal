const vehicleModel = require('../models/vehicleModel');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const vehicleController = {
  getVehicles: async (req, res, next) => {
    try {
      const filters = {
        categoryId: req.query.categoryId || req.query.category,
        branchId: req.query.branchId || req.query.branch,
        fuelType: req.query.fuelType || req.query.fuel,
        transmission: req.query.transmission,
        maxPrice: req.query.maxPrice || req.query.price,
        status: req.query.status,
        search: req.query.search
      };

      const vehicles = await vehicleModel.findVehicles(filters);
      return successResponse(res, 200, 'Vehicles retrieved successfully', vehicles);
    } catch (err) {
      next(err);
    }
  },

  getVehicleById: async (req, res, next) => {
    try {
      const vehicle = await vehicleModel.findById(req.params.id);
      if (!vehicle) {
        return errorResponse(res, 404, 'Vehicle not found.');
      }
      return successResponse(res, 200, 'Vehicle details retrieved successfully', vehicle);
    } catch (err) {
      next(err);
    }
  },

  createVehicle: async (req, res, next) => {
    try {
      const vehicleId = await vehicleModel.createVehicle(req.body);
      const vehicle = await vehicleModel.findById(vehicleId);
      return successResponse(res, 201, 'Vehicle created successfully', vehicle);
    } catch (err) {
      next(err);
    }
  },

  updateVehicle: async (req, res, next) => {
    try {
      const vehicle = await vehicleModel.updateVehicle(req.params.id, req.body);
      if (!vehicle) {
        return errorResponse(res, 404, 'Vehicle not found to update.');
      }
      return successResponse(res, 200, 'Vehicle updated successfully', vehicle);
    } catch (err) {
      next(err);
    }
  },

  deleteVehicle: async (req, res, next) => {
    try {
      const deleted = await vehicleModel.deleteVehicle(req.params.id);
      if (!deleted) {
        return errorResponse(res, 404, 'Vehicle not found to delete.');
      }
      return successResponse(res, 200, 'Vehicle removed from fleet successfully');
    } catch (err) {
      next(err);
    }
  },

  getCategories: async (req, res, next) => {
    try {
      const categories = await vehicleModel.getAllCategories();
      return successResponse(res, 200, 'Categories retrieved successfully', categories);
    } catch (err) {
      next(err);
    }
  },

  createCategory: async (req, res, next) => {
    try {
      const catId = await vehicleModel.createCategory(req.body);
      return successResponse(res, 201, 'Category created successfully', { categoryId: catId });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = vehicleController;
