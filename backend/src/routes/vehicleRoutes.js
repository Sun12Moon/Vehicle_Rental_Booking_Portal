const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

const router = express.Router();

// Public routes
router.get('/', vehicleController.getVehicles);
router.get('/categories', vehicleController.getCategories);
router.get('/:id', vehicleController.getVehicleById);

// Admin-only fleet routes
router.post('/', authenticateToken, requireAdmin, vehicleController.createVehicle);
router.put('/:id', authenticateToken, requireAdmin, vehicleController.updateVehicle);
router.delete('/:id', authenticateToken, requireAdmin, vehicleController.deleteVehicle);
router.post('/categories', authenticateToken, requireAdmin, vehicleController.createCategory);

module.exports = router;
