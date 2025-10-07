const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');

class AuthController {
  // Register with email verification
  async register(req, res) {
    try {
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
        lastName,
        emailVerified: false
      });

      // Send verification email
      try {
        await emailService.sendVerificationEmail(user);
        console.log('✅ Verification email sent to:', user.email);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Continue registration even if email fails
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
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Login
  async login(req, res) {
    try {
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

      // (Optional) Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in'
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        process.env.JWT_SECRET,
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
            emailVerified: user.emailVerified
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  }

  // Verify email
  async verifyEmail(req, res) {
    try {
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
        decoded = await emailService.verifyEmailToken(token);
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

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      res.json({
        success: true,
        message: 'Email verified successfully! You can now log in.'
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  }

  // Resend verification email
  async resendVerificationEmail(req, res) {
    try {
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

  // Get current user
  async getCurrentUser(req, res) {
    try {
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
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }
}

module.exports = new AuthController();
