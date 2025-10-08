const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthController {
  async register(req, res) {
    try {
      // Dynamically import User model to avoid circular dependency
      const { User } = require('../models');
      const { Op } = require('sequelize');
      
      const { username, email, password, firstName, lastName } = req.body;

      // Validate input
      if (!username || !email || !password || !firstName) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields'
        });
      }

      // Check if user exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || '',
        emailVerified: false
      });

      // Try to send verification email (non-blocking)
      try {
        const emailService = require('../services/emailService');
        await emailService.sendVerificationEmail(user);
        console.log('✅ Verification email sent to:', user.email);
      } catch (emailError) {
        console.error('⚠️ Email service error:', emailError.message);
        // Continue even if email fails
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            emailVerified: false
          }
        }
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async login(req, res) {
    try {
      const { User } = require('../models');
      const { Op } = require('sequelize');
      
      const { emailOrUsername, password } = req.body;

      if (!emailOrUsername || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email/username and password are required'
        });
      }

      // Find user
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: emailOrUsername },
            { username: emailOrUsername }
          ]
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        process.env.JWT_SECRET || 'your-secret-key-change-this',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified || false
          }
        }
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { User } = require('../models');
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required'
        });
      }

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token'
        });
      }

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
          message: 'Email is already verified'
        });
      }

      // Update user
      user.emailVerified = true;
      await user.save();

      // Try to send welcome email (non-blocking)
      try {
        const emailService = require('../services/emailService');
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        console.error('⚠️ Welcome email error:', emailError.message);
      }

      res.json({
        success: true,
        message: 'Email verified successfully! You can now log in.'
      });

    } catch (error) {
      console.error('❌ Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  }

  async getCurrentUser(req, res) {
    try {
      const { User } = require('../models');
      
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { user }
      });

    } catch (error) {
      console.error('❌ Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }

  async resendVerificationEmail(req, res) {
    try {
      const { User } = require('../models');
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });

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

      // Send verification email
      try {
        const emailService = require('../services/emailService');
        await emailService.sendVerificationEmail(user);
      } catch (emailError) {
        console.error('⚠️ Resend email error:', emailError.message);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email'
        });
      }

      res.json({
        success: true,
        message: 'Verification email sent! Please check your inbox.'
      });

    } catch (error) {
      console.error('❌ Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend verification email'
      });
    }
  }
}

module.exports = new AuthController();
