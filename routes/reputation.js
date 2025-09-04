const express = require('express');
const { authenticate: authenticateToken } = require('../middleware/auth'); // ✅ FIXED: Correct import
const reputationService = require('../services/reputationService');
const { param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get current user's reputation
router.get('/me',
  authenticateToken, // ✅ FIXED: Removed unnecessary validation for /me route
  async (req, res) => {
    try {
      const reputation = await reputationService.getUserReputation(req.user.id);
      
      res.json({
        success: true,
        data: { reputation }
      });
    } catch (error) {
      console.error('Get my reputation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch reputation'
      });
    }
  }
);

// Get user reputation by ID
router.get('/user/:userId',
  [
    param('userId')
      .isUUID()
      .withMessage('Invalid user ID'),
    handleValidationErrors
  ],
  async (req, res) => {
    try {
      const { userId } = req.params;
      const reputation = await reputationService.getUserReputation(userId);
      
      res.json({
        success: true,
        data: { reputation }
      });
    } catch (error) {
      console.error('Get user reputation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user reputation'
      });
    }
  }
);

// Get reputation leaderboard
router.get('/leaderboard',
  async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const leaderboard = await reputationService.getLeaderboard(parseInt(limit), offset);
      
      const totalPages = Math.ceil(leaderboard.count / parseInt(limit));
      
      res.json({
        success: true,
        data: {
          leaderboard: leaderboard.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: leaderboard.count,
            itemsPerPage: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard'
      });
    }
  }
);

// Recalculate user reputation (for testing/admin)
router.post('/recalculate',
  authenticateToken, // ✅ FIXED: Now correctly references the imported function
  async (req, res) => {
    try {
      const reputation = await reputationService.calculateUserReputation(req.user.id);
      
      res.json({
        success: true,
        message: 'Reputation recalculated successfully',
        data: { reputation }
      });
    } catch (error) {
      console.error('Recalculate reputation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to recalculate reputation'
      });
    }
  }
);

module.exports = router;
