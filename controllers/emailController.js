const emailService = require('../services/emailService');
const { User } = require('../models');

class EmailController {
  constructor() {
    this.verifyEmail = this.verifyEmail.bind(this);
    this.resendVerification = this.resendVerification.bind(this);
  }

  // Verify email with token
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      // Verify token
      const decoded = await emailService.verifyEmailToken(token);

      // Find user
      const user = await User.findByPk(decoded.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified'
        });
      }

      // Mark email as verified
      await user.update({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (error) {
        console.error('Failed to send welcome email:', error);
      }

      res.json({
        success: true,
        message: 'Email verified successfully! Welcome to Ideashpere! 🎉'
      });

    } catch (error) {
      console.error('Email verification error:', error);
      
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token. Please request a new verification email.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  }

  // Resend verification email
  async resendVerification(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      const user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      // Send new verification email
      await emailService.sendVerificationEmail(user);

      res.json({
        success: true,
        message: 'Verification email sent! Please check your inbox.'
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend verification email'
      });
    }
  }
}

module.exports = new EmailController();
