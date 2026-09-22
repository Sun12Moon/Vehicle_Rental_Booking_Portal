const branchModel = require('../models/branchModel');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const branchController = {
  getBranches: async (req, res, next) => {
    try {
      const branches = await branchModel.getAllBranches();
      return successResponse(res, 200, 'Branches retrieved successfully', branches);
    } catch (err) {
      next(err);
    }
  },

  getBranchById: async (req, res, next) => {
    try {
      const branch = await branchModel.getBranchById(req.params.id);
      if (!branch) {
        return errorResponse(res, 404, 'Branch not found.');
      }
      return successResponse(res, 200, 'Branch details retrieved', branch);
    } catch (err) {
      next(err);
    }
  },

  createBranch: async (req, res, next) => {
    try {
      const branchId = await branchModel.createBranch(req.body);
      const branch = await branchModel.getBranchById(branchId);
      return successResponse(res, 201, 'Branch created successfully', branch);
    } catch (err) {
      next(err);
    }
  },

  updateBranch: async (req, res, next) => {
    try {
      const branch = await branchModel.updateBranch(req.params.id, req.body);
      if (!branch) {
        return errorResponse(res, 404, 'Branch not found.');
      }
      return successResponse(res, 200, 'Branch updated successfully', branch);
    } catch (err) {
      next(err);
    }
  }
};

module.exports = branchController;
