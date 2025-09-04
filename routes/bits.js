const express = require('express');
const bitController = require('../controllers/bitController');
const { authenticate: authenticateToken } = require('../middleware/auth'); // Fixed import
const { requirePermission, PERMISSIONS } = require('../middleware/rbac');
const { validateBitCreation, handleValidationErrors } = require('../middleware/validation');
const { param } = require('express-validator');

const router = express.Router();

// Create bit
router.post('/',
  authenticateToken,
  requirePermission(PERMISSIONS.CREATE_BIT),
  validateBitCreation, // Use centralized validation
  bitController.createBit
);

// Get all bits with filtering and pagination
router.get('/', bitController.getBits);

// Search bits
router.get('/search', bitController.searchBits);

// Get specific bit by ID or slug
router.get('/:identifier',
  [
    param('identifier').notEmpty().withMessage('Bit identifier is required'),
    handleValidationErrors
  ],
  bitController.getBitById
);

// Update bit
router.put('/:bitId',
  authenticateToken,
  [
    param('bitId').isUUID().withMessage('Invalid bit ID'),
    handleValidationErrors
  ],
  bitController.updateBit
);

// Delete bit
router.delete('/:bitId',
  authenticateToken,
  [
    param('bitId').isUUID().withMessage('Invalid bit ID'),
    handleValidationErrors
  ],
  bitController.deleteBit
);

// Like/unlike bit
router.post('/:bitId/like',
  authenticateToken,
  [
    param('bitId').isUUID().withMessage('Invalid bit ID'),
    handleValidationErrors
  ],
  bitController.likeBit
);

module.exports = router;
