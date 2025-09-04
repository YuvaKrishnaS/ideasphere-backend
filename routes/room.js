const express = require('express');
const roomController = require('../controllers/roomController');
const { authenticate } = require('../middleware/auth');
const {
  validateRoomCreate,
  validateRoomUpdate,
  validateRoomQuery
} = require('../middleware/roomValidation');

const router = express.Router();

console.log('roomController:', roomController);
console.log('getPublicRooms:', roomController.getPublicRooms);

// Public routes
router.get('/public', validateRoomQuery, roomController.getPublicRooms);
router.get('/:id', authenticate, roomController.getRoom);

// Protected routes
router.post('/', authenticate, validateRoomCreate, roomController.create);
router.put('/:id', authenticate, validateRoomUpdate, roomController.update);
router.post('/:id/end', authenticate, roomController.endRoom);
router.get('/user/history', authenticate, validateRoomQuery, roomController.getUserRooms);

module.exports = router;
