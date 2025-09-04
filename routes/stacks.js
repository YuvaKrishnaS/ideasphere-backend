const express = require('express');
const stackController = require('../controllers/stackController');
const { authenticate: authenticateToken } = require('../middleware/auth'); // Fixed import
const { requirePermission, PERMISSIONS, canPostStacks } = require('../middleware/rbac');
const { validateStackCreation, handleValidationErrors } = require('../middleware/validation');
const { param } = require('express-validator');

const router = express.Router();

// Create stack (requires permission)
router.post('/',
  authenticateToken,
  canPostStacks,
  validateStackCreation, // Use centralized validation
  stackController.createStack
);

// Get all stacks with filtering and pagination
router.get('/', stackController.getStacks);

// Search stacks
router.get('/search', stackController.searchStacks);

// Get specific stack by ID or slug
router.get('/:identifier',
  [
    param('identifier').notEmpty().withMessage('Stack identifier is required'),
    handleValidationErrors
  ],
  stackController.getStackById
);

// Update stack
router.put('/:stackId',
  authenticateToken,
  [
    param('stackId').isUUID().withMessage('Invalid stack ID'),
    handleValidationErrors
  ],
  stackController.updateStack
);

// Delete stack
router.delete('/:stackId',
  authenticateToken,
  [
    param('stackId').isUUID().withMessage('Invalid stack ID'),
    handleValidationErrors
  ],
  stackController.deleteStack
);

// Like/unlike stack
router.post('/:stackId/like',
  authenticateToken,
  [
    param('stackId').isUUID().withMessage('Invalid stack ID'),
    handleValidationErrors
  ],
  stackController.likeStack
);

// Rate stack
router.post('/:stackId/rate',
  authenticateToken,
  [
    param('stackId').isUUID().withMessage('Invalid stack ID'),
    handleValidationErrors
  ],
  stackController.rateStack
);

// Approve/reject stack (admin/moderator only)
router.patch('/:stackId/approve',
  authenticateToken,
  requirePermission(PERMISSIONS.RESOLVE_REPORTS),
  [
    param('stackId').isUUID().withMessage('Invalid stack ID'),
    handleValidationErrors
  ],
  stackController.approveStack
);

module.exports = router;
