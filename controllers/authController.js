const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { Op } = require('sequelize');
const emailService = require('../services/emailService');

class AuthController {
  constructor() {
    // Fix: Bind all methods to preserve 'this' context
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.logout = this.logout.bind(this);
    this.changePassword = this.changePassword.bind(this);
  }

  // Generate JWT Token
  generateToken(user) {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        username: user.username 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRE || '7d',
        issuer: 'ideashpere',
        audience: 'ideashpere-users'
      }
    );
  }

  // Generate Refresh Token
  generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  // Register new user
  async register(req, res) {
    try {
      const { username, email, password, firstName, lastName, dateOfBirth } = req.body;

      // Validate required fields
      if (!username || !email || !password || !firstName) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, password, and first name are required'
        });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: email.toLowerCase().trim() },
            { username: username.toLowerCase().trim() }
          ]
        }
      });

      if (existingUser) {
        const field = existingUser.email === email.toLowerCase().trim() ? 'Email' : 'Username';
        return res.status(409).json({
          success: false,
          message: `${field} already exists`
        });
      }

      // Hash password manually (since User model's beforeSave hook might not work properly)
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName?.trim(),
        dateOfBirth,
        emailVerificationToken: crypto.randomBytes(32).toString('hex')
      });

      // Generate tokens - 'this' is now correctly bound
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken();

      // Update user with refresh token
      await user.update({ 
        lastLoginAt: new Date(),
        passwordResetToken: refreshToken
      });
      // 🔥 NEW: Send verification email
      try {
        await emailService.sendVerificationEmail(user);
        console.log('✅ Verification email queued for:', user.email);
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError);
        // Don't fail registration if email fails, just log it
      }

      res.status(201).json({
        success: true,
        message: 'User registered successfully! Please check your email to verify your account.',
        data: {
          token,
          refreshToken,
          user: user.toJSON(),
          emailSent: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          refreshToken,
          user: user.toJSON()
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error during registration',
        error: error.message
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { emailOrUsername, password } = req.body;

      // Validate input
      if (!emailOrUsername || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email/Username and password are required'
        });
      }

      // Find user by email or username
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: emailOrUsername.toLowerCase().trim() },
            { username: emailOrUsername.toLowerCase().trim() }
          ],
          isActive: true
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

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken();

      // Update last login
      await user.update({ 
        lastLoginAt: new Date(),
        passwordResetToken: refreshToken
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          refreshToken,
          user: user.toJSON()
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        include: [
          {
            association: 'interests',
            through: { attributes: ['proficiencyLevel', 'isPrimary'] }
          }
        ]
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
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, bio, location, website, githubProfile, linkedinProfile } = req.body;
      
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update allowed fields only
      const updateData = {};
      if (firstName !== undefined) updateData.firstName = firstName.trim();
      if (lastName !== undefined) updateData.lastName = lastName?.trim();
      if (bio !== undefined) updateData.bio = bio.trim();
      if (location !== undefined) updateData.location = location.trim();
      if (website !== undefined) updateData.website = website.trim();
      if (githubProfile !== undefined) updateData.githubProfile = githubProfile.trim();
      if (linkedinProfile !== undefined) updateData.linkedinProfile = linkedinProfile.trim();

      await user.update(updateData);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: user.toJSON() }
      });

    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error updating profile'
      });
    }
  }

  // Refresh JWT token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Find user with this refresh token
      const user = await User.findOne({
        where: { 
          passwordResetToken: refreshToken,
          isActive: true
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken();

      // Update refresh token
      await user.update({ passwordResetToken: newRefreshToken });

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Error refreshing token'
      });
    }
  }

  // Logout (invalidate refresh token)
  async logout(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (user) {
        await user.update({ passwordResetToken: null });
      }

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during logout'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 8 characters long'
        });
      }

      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await user.update({ 
        password: hashedPassword,
        passwordResetToken: null // Invalidate all refresh tokens
      });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Error changing password'
      });
    }
  }
}

module.exports = new AuthController();
