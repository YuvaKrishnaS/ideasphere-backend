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

      if (!username || !email || !password || !firstName) {
        return res.status(400).json({ success: false, message: 'Please provide all required fields' });
      }

      const existingUser = await User.findOne({
        where: { [Op.or]: [{ email }, { username }] }
      });

      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email or username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: false
      });

      try {
        await emailService.sendVerificationEmail(user);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful! Please check your email to verify your account.',
        data: { user: { id: user.id, username: user.username } }
      });
    } catch (error) {
      console.error('Registration Error:', error.message);
      res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
  }

  // Login
  async login(req, res) {
    try {
      const { emailOrUsername, password } = req.body;

      if (!emailOrUsername || !password) {
        return res.status(400).json({ success: false, message: 'Email/username and password are required' });
      }

      const user = await User.findOne({
        where: { [Op.or]: [{ email: emailOrUsername }, { username: emailOrUsername }] }
      });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // ⚠️ IMPORTANT: I am commenting this out for now so you can test login without verifying.
      // if (!user.emailVerified) {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'Please verify your email before logging in.',
      //     emailVerified: false
      //   });
      // }

      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        success: true,
        message: 'Login successful',
        data: { token, user: { id: user.id, username: user.username } }
      });
    } catch (error) {
      console.error('Login Error:', error.message);
      res.status(500).json({ success: false, message: 'Server error during login.' });
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
