const express = require('express');
const router = express.Router();

// Health check first (always works)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are operational',
    timestamp: new Date().toISOString()
  });
});

// Load controller with detailed error logging
let authController;
try {
  authController = require('../controllers/authController');
  console.log('✅ Auth controller loaded');
} catch (error) {
  console.error('❌ Auth controller load error:', error.message);
  console.error('Stack:', error.stack);
  
  // Create fallback controller
  authController = {
    register: (req, res) => res.status(503).json({ success: false, message: 'Auth controller failed to load', error: error.message }),
    login: (req, res) => res.status(503).json({ success: false, message: 'Auth controller failed to load', error: error.message }),
    verifyEmail: (req, res) => res.status(503).json({ success: false, message: 'Auth controller failed to load', error: error.message }),
    getCurrentUser: (req, res) => res.status(503).json({ success: false, message: 'Auth controller failed to load', error: error.message }),
    resendVerificationEmail: (req, res) => res.status(503).json({ success: false, message: 'Auth controller failed to load', error: error.message })
  };
}

// Load middleware
let authenticate;
try {
  const authMiddleware = require('../middleware/auth');
  authenticate = authMiddleware.authenticate;
} catch (error) {
  console.error('❌ Auth middleware load error:', error.message);
  authenticate = (req, res, next) => {
    res.status(503).json({ success: false, message: 'Auth middleware unavailable' });
  };
}

// Register routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
