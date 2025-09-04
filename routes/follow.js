const express = require('express');
const followController = require('../controllers/followController');
const { authenticate: authenticateToken } = require('../middleware/auth');
const { param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Follow a user
router.post('/:userId',
  authenticateToken,
  [
    param('userId').isUUID().withMessage('Invalid user ID'),
    handleValidationErrors
  ],
  followController.followUser
);

// Unfollow a user
router.delete('/:userId',
  authenticateToken,
  [
    param('userId').isUUID().withMessage('Invalid user ID'),
    handleValidationErrors
  ],
  followController.unfollowUser
);

// Get user's followers
router.get('/:userId/followers',
  [
    param('userId').isUUID().withMessage('Invalid user ID'),
    handleValidationErrors
  ],
  followController.getFollowers
);

// Get users a user is following
router.get('/:userId/following',
  [
    param('userId').isUUID().withMessage('Invalid user ID'),
    handleValidationErrors
  ],
  followController.getFollowing
);

// Get suggested users to follow
router.get('/suggestions',
  authenticateToken,
  followController.getSuggestedUsers
);

// Get follow statistics
router.get('/:userId/stats',
  [
    param('userId').isUUID().withMessage('Invalid user ID'),
    handleValidationErrors
  ],
  followController.getFollowStats
);

module.exports = router;
