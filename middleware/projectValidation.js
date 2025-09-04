const { body, query } = require('express-validator');
const { handleValidationErrors } = require('./validation');

// Project creation validation
const validateProjectCreate = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5-200 characters')
    .trim(),
    
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20-5000 characters')
    .trim(),
    
  body('content')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Content cannot exceed 50000 characters'),
    
  body('type')
    .optional()
    .isIn(['project', 'tutorial', 'showcase'])
    .withMessage('Type must be project, tutorial, or showcase'),
    
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
    
  body('thumbnailImage')
    .optional()
    .isURL()
    .withMessage('Thumbnail image must be a valid URL'),
    
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
    
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL'),
    
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Video URL must be valid'),
    
  body('githubRepo')
    .optional()
    .isURL()
    .withMessage('GitHub repository must be a valid URL'),
    
  body('liveUrl')
    .optional()
    .isURL()
    .withMessage('Live URL must be valid'),
    
  body('technologies')
    .optional()
    .isArray()
    .withMessage('Technologies must be an array'),
    
  body('estimatedTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated time must be a positive integer'),
    
  body('isCollaborative')
    .optional()
    .isBoolean()
    .withMessage('isCollaborative must be a boolean'),
    
  body('maxCollaborators')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max collaborators must be between 1-50'),
    
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
    
  handleValidationErrors
];

// Project update validation (same as create but all optional)
const validateProjectUpdate = [
  body('title')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5-200 characters')
    .trim(),
    
  body('description')
    .optional()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Description must be between 20-5000 characters')
    .trim(),
    
  body('content')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Content cannot exceed 50000 characters'),
    
  body('type')
    .optional()
    .isIn(['project', 'tutorial', 'showcase'])
    .withMessage('Type must be project, tutorial, or showcase'),
    
  body('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
    
  body('thumbnailImage')
    .optional()
    .isURL()
    .withMessage('Thumbnail image must be a valid URL'),
    
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
    
  body('videoUrl')
    .optional()
    .isURL()
    .withMessage('Video URL must be valid'),
    
  body('githubRepo')
    .optional()
    .isURL()
    .withMessage('GitHub repository must be a valid URL'),
    
  body('liveUrl')
    .optional()
    .isURL()
    .withMessage('Live URL must be valid'),
    
  body('technologies')
    .optional()
    .isArray()
    .withMessage('Technologies must be an array'),
    
  body('estimatedTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Estimated time must be a positive integer'),
    
  body('isCollaborative')
    .optional()
    .isBoolean()
    .withMessage('isCollaborative must be a boolean'),
    
  body('maxCollaborators')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max collaborators must be between 1-50'),
    
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array'),
    
  handleValidationErrors
];

// Query validation for getting projects
const validateProjectQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1-50'),
    
  query('type')
    .optional()
    .isIn(['project', 'tutorial', 'showcase'])
    .withMessage('Type must be project, tutorial, or showcase'),
    
  query('difficulty')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced'])
    .withMessage('Difficulty must be beginner, intermediate, or advanced'),
    
  query('sortBy')
    .optional()
    .isIn(['newest', 'oldest', 'popular', 'views'])
    .withMessage('SortBy must be newest, oldest, popular, or views'),
    
  handleValidationErrors
];

// Interest validation
const validateInterestUpdate = [
  body('interests')
    .isArray({ min: 1, max: 10 })
    .withMessage('Interests must be an array with 1-10 items'),
    
  body('interests.*.interestId')
    .isUUID()
    .withMessage('Interest ID must be a valid UUID'),
    
  body('interests.*.proficiencyLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Proficiency level must be beginner, intermediate, advanced, or expert'),
    
  body('interests.*.isPrimary')
    .optional()
    .isBoolean()
    .withMessage('isPrimary must be a boolean'),
    
  handleValidationErrors
];

module.exports = {
  validateProjectCreate,
  validateProjectUpdate,
  validateProjectQuery,
  validateInterestUpdate
};
