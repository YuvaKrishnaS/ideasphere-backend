const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { 
  validateRegistration, 
  validateLogin, 
  validateProfileUpdate,
  validatePasswordChange
} = require('../middleware/validation');
const { authLimiter, passwordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes
router.post('/register', authLimiter, validateRegistration, authController.register);
router.post('/login', authLimiter, validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, validateProfileUpdate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, passwordLimiter, validatePasswordChange, authController.changePassword);

module.exports = router;
