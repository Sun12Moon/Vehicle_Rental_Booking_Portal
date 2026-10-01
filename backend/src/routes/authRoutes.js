const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('firstName').notEmpty().withMessage('First name is required'),
    validate
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  authController.login
);

router.post('/google', authController.googleAuth);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/profile', authenticateToken, authController.updateProfile);

module.exports = router;
