const express = require('express');
const projectController = require('../controllers/projectController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { 
  validateProjectCreate, 
  validateProjectUpdate,
  validateProjectQuery 
} = require('../middleware/projectValidation');

const router = express.Router();

// Public routes (with optional auth for personalized features)
router.get('/', optionalAuth, validateProjectQuery, projectController.getAll);
router.get('/feed', authenticate, validateProjectQuery, projectController.getFeed);
router.get('/:id', optionalAuth, projectController.getById);

// Protected routes
router.post('/', authenticate, validateProjectCreate, projectController.create);
router.put('/:id', authenticate, validateProjectUpdate, projectController.update);
router.delete('/:id', authenticate, projectController.delete);

// Interaction routes
router.post('/:id/like', authenticate, projectController.toggleLike);
router.post('/:id/bookmark', authenticate, projectController.toggleBookmark);

module.exports = router;
