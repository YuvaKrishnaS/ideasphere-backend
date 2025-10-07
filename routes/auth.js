const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Registration & Login
router.post('/register', authController.register);
router.post('/login', authController.login);

// Email Verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

// Password Reset
router.post('/request-password-reset', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);

// Get current user (protected route)
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
