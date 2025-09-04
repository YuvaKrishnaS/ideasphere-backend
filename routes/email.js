const express = require('express');
const emailController = require('../controllers/emailController');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Verify email
router.post('/verify', [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required'),
  handleValidationErrors
], emailController.verifyEmail);

// Resend verification email
router.post('/resend-verification', [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  handleValidationErrors
], emailController.resendVerification);

module.exports = router;
