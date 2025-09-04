const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

class PasswordResetController {
  constructor() {
    this.requestReset = this.requestReset.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.validateResetToken = this.validateResetToken.bind(this);
  }

  // Step 1: Request password reset (send email)
  async requestReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email address is required'
        });
      }

      // Find user by email
      const user = await User.findOne({ 
        where: { 
          email: email.toLowerCase().trim(),
          isActive: true 
        } 
      });

      // Always return success (security: don't reveal if email exists)
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account with that email exists, we\'ve sent password reset instructions.'
        });
      }

      // Generate secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to database
      await user.update({
        passwordResetToken: resetToken,
        passwordResetExpires: resetTokenExpires
      });

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      // Send reset email
      await emailService.sendPasswordResetEmail(user, resetUrl);

      res.json({
        success: true,
        message: 'If an account with that email exists, we\'ve sent password reset instructions.'
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to process password reset request. Please try again.'
      });
    }
  }

  // Step 2: Reset password with token
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Reset token and new password are required'
        });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      // Find user with valid token
      const user = await User.findOne({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            [Op.gt]: new Date() // Token not expired
          },
          isActive: true
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Password reset token is invalid or has expired'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await user.update({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      });

      // Send confirmation email
      try {
        await emailService.sendPasswordResetConfirmationEmail(user);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      });

      console.log(`✅ Password reset successful for user: ${user.email}`);

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset password. Please try again.'
      });
    }
  }

  // Step 3: Validate reset token (for frontend form)
  async validateResetToken(req, res) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Reset token is required'
        });
      }

      // Check if token exists and is not expired
      const user = await User.findOne({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            [Op.gt]: new Date()
          },
          isActive: true
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Reset token is invalid or has expired'
        });
      }

      res.json({
        success: true,
        message: 'Reset token is valid',
        data: {
          email: user.email,
          firstName: user.firstName
        }
      });

    } catch (error) {
      console.error('Token validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to validate reset token'
      });
    }
  }
}

module.exports = new PasswordResetController();
