const { body, validationResult } = require('express-validator');

// Enhanced error handler with better formatting
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Registration validation rules
const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .toLowerCase(),
  
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('firstName')
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .trim(),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .trim(),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      if (value) {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 13) {
          throw new Error('User must be at least 13 years old');
        }
        
        if (age > 100) {
          throw new Error('Please enter a valid birth date');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

// Login validation rules
const validateLogin = [
  body('emailOrUsername')
    .notEmpty()
    .withMessage('Email or username is required')
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Profile update validation rules
const validateProfileUpdate = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1-50 characters')
    .trim(),
  
  body('lastName')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .trim(),
  
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
    .trim(),
  
  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters')
    .trim(),
  
  body('website')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Website must be a valid URL'),
  
  body('githubProfile')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('GitHub profile must be a valid URL')
    .custom((value) => {
      if (value && !value.includes('github.com')) {
        throw new Error('GitHub profile must be a github.com URL');
      }
      return true;
    }),
  
  body('linkedinProfile')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('LinkedIn profile must be a valid URL')
    .custom((value) => {
      if (value && !value.includes('linkedin.com')) {
        throw new Error('LinkedIn profile must be a linkedin.com URL');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Password change validation rules
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Content validation rules for Bits and Stacks
const validateBitCreation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Content must be between 1 and 2000 characters'),
  
  body('type')
    .optional()
    .isIn(['text', 'code', 'image', 'link'])
    .withMessage('Invalid bit type'),
  
  body('technologies')
    .optional()
    .isArray()
    .withMessage('Technologies must be an array'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  handleValidationErrors
];

const validateStackCreation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Title must be between 1 and 300 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('content')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Content must be at least 50 characters long'),
  
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Invalid difficulty level'),
  
  body('estimatedTime')
    .optional()
    .isInt({ min: 1, max: 1440 }) // Max 24 hours
    .withMessage('Estimated time must be between 1-1440 minutes'),
  
  body('technologies')
    .optional()
    .isArray()
    .withMessage('Technologies must be an array'),
  
  body('prerequisites')
    .optional()
    .isArray()
    .withMessage('Prerequisites must be an array'),
  
  handleValidationErrors
];

// Report validation rules
const validateReport = [
  body('contentType')
    .isIn(['user', 'bit', 'stack', 'comment', 'chat_message', 'room'])
    .withMessage('Invalid content type'),
  
  body('reason')
    .isIn(['spam', 'harassment', 'inappropriate_content', 'fake_information', 'violence', 'hate_speech', 'copyright', 'other'])
    .withMessage('Invalid reason'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('reportedUserId')
    .optional()
    .isUUID()
    .withMessage('Invalid reported user ID'),
  
  body('contentId')
    .optional()
    .isUUID()
    .withMessage('Invalid content ID'),
  
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
  validateBitCreation,
  validateStackCreation,
  validateReport,
  handleValidationErrors
};
