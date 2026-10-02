const express = require('express');
const multer = require('multer');
const kycController = require('../controllers/kycController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Multer: memory storage, accept image + pdf, max 5 MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WEBP, TIFF, or PDF files are accepted.'));
    }
  }
});

// Protected KYC routes
router.post('/session',  authenticateToken, kycController.createSession);
router.get('/my-status', authenticateToken, kycController.getMyStatus);
router.post('/verify',   authenticateToken, kycController.completeVerification);
router.post('/verify-images',
  authenticateToken,
  upload.fields([
    { name: 'front_image', maxCount: 1 },
    { name: 'back_image',  maxCount: 1 }
  ]),
  kycController.verifyWithImages
);
router.post('/reset',    authenticateToken, kycController.resetKyc);

// Public Didit Webhook Callback
router.post('/webhook', kycController.handleWebhook);

module.exports = router;
