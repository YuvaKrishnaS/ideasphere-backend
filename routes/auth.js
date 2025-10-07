const express = require('express');
const router = express.Router();

let authController;
try {
  authController = require('../controllers/authController');
  console.log('✅ Auth controller loaded successfully');
} catch (error) {
  console.error('❌ Failed to load auth controller:', error.message);

  const fallbackHandler = (req, res) => {
    res.status(503).json({
      success: false,
      message: '/api/auth routes temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  };

  authController = {
    register: fallbackHandler,
    login: fallbackHandler,
    verifyEmail: fallbackHandler,
    resendVerificationEmail: fallbackHandler,
    getCurrentUser: fallbackHandler
  };
}

let authenticate;
try {
  const authMiddleware = require('../middleware/auth');
  authenticate = authMiddleware.authenticate;
} catch (error) {
  console.error('❌ Failed to load auth middleware:', error.message);
  authenticate = (req, res, next) => {
    res.status(503).json({
      success: false,
      message: 'Authentication middleware unavailable'
    });
  };
}

// Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

router.get('/me', authenticate, authController.getCurrentUser);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are operational',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/verify-email',
      'POST /api/auth/resend-verification',
      'GET /api/auth/me'
    ]
  });
});

module.exports = router;
