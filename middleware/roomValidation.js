const { body, query, validationResult } = require('express-validator');

const validateRoomCreate = [
  body('name')
    .notEmpty()
    .withMessage('Room name is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Room name must be between 3-100 characters'),
  // ... add other create validation rules ...
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

// Create validateRoomUpdate, typically similar but all fields optional for updates:
const validateRoomUpdate = [
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Room name must be between 3-100 characters'),
  // ... other optional validation rules for update ...
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

const validateRoomQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1-50'),
  query('status')
    .optional()
    .isIn(['all', 'active', 'ended'])
    .withMessage('Status must be all, active or ended'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
  }
];

module.exports = {
  validateRoomCreate,
  validateRoomUpdate,
  validateRoomQuery
};
