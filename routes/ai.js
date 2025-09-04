const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticate: authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Get personalized feed
router.get('/feed',
  authenticateToken,
  aiController.getPersonalizedFeed
);

// Track user interaction
router.post('/interaction',
  authenticateToken,
  [
    body('contentType')
      .isIn(['bit', 'stack', 'user', 'room'])
      .withMessage('Invalid content type'),
    body('contentId')
      .isUUID()
      .withMessage('Invalid content ID'),
    body('interactionType')
      .isIn(['view', 'like', 'comment', 'share', 'bookmark', 'follow', 'join', 'complete'])
      .withMessage('Invalid interaction type'),
    body('duration')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Duration must be a positive integer'),
    handleValidationErrors
  ],
  aiController.trackInteraction
);

// Get user analytics
router.get('/analytics',
  authenticateToken,
  aiController.getUserAnalytics
);

module.exports = router;
