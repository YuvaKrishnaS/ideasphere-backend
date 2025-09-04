const express = require('express');
const interestController = require('../controllers/interestController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validateInterestUpdate } = require('../middleware/projectValidation');

const router = express.Router();

// Get all interests (public with optional auth for personalization)
router.get('/', optionalAuth, interestController.getAll);

// Get interest statistics
router.get('/stats', interestController.getInterestStats);

// User interest management (protected routes)
router.put('/user', authenticate, validateInterestUpdate, interestController.updateUserInterests);
router.get('/user/:userId', authenticate, interestController.getUserInterests);  

module.exports = router;
