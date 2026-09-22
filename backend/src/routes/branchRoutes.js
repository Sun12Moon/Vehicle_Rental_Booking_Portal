const express = require('express');
const branchController = require('../controllers/branchController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', branchController.getBranches);
router.get('/:id', branchController.getBranchById);
router.post('/', authenticateToken, requireAdmin, branchController.createBranch);
router.put('/:id', authenticateToken, requireAdmin, branchController.updateBranch);

module.exports = router;
