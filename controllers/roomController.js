const { Room, User, RoomMember, Interest } = require('../models');
const { Op } = require('sequelize');
const valkeyClient = require('../config/valkey');

class RoomController {
  // Create new room
  async create(req, res) {
    try {
      const {
        name,
        description,
        topic,
        maxParticipants = 10,
        isPublic = true,
        technologies = [],
        interests = []
      } = req.body;

      const user = req.user;

      // Generate unique room code
      let roomCode;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const existingRoom = await Room.findOne({ where: { roomCode } });
        isUnique = !existingRoom;
        attempts++;
      }

      if (!isUnique) {
        return res.status(500).json({
          success: false,
          message: 'Failed to generate unique room code'
        });
      }

      // Create room
      const room = await Room.create({
        name,
        description,
        topic,
        maxParticipants,
        isPublic,
        technologies,
        roomCode,
        ownerId: user.id
      });

      // Add creator as owner member
      await RoomMember.create({
        roomId: room.id,
        userId: user.id,
        role: 'owner'
      });

      // Associate interests
      if (interests.length > 0) {
        const validInterests = await Interest.findAll({
          where: { 
            id: { [Op.in]: interests },
            isActive: true 
          }
        });

        if (validInterests.length > 0) {
          await room.setInterests(validInterests.map(i => i.id));
        }
      }

      // Initialize room in Valkey
      await valkeyClient.setRoomData(room.id, {
        name: room.name,
        topic: room.topic,
        createdAt: room.createdAt.toISOString(),
        ownerId: user.id
      });

      // Fetch complete room data
      const completeRoom = await Room.findByPk(room.id, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          },
          {
            model: Interest,
            as: 'interests',
            through: { attributes: [] }
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Room created successfully',
        data: { room: completeRoom }
      });

    } catch (error) {
      console.error('Create room error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create room'
      });
    }
  }

  // Get all active public rooms
  async getPublicRooms(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        search = '', 
        interests = '' 
      } = req.query;

      const offset = (page - 1) * limit;
      const whereConditions = {
        isActive: true,
        isPublic: true
      };

      // Search functionality
      if (search.trim()) {
        whereConditions[Op.or] = [
          { name: { [Op.iLike]: `%${search.trim()}%` } },
          { topic: { [Op.iLike]: `%${search.trim()}%` } },
          { description: { [Op.iLike]: `%${search.trim()}%` } }
        ];
      }

      // Include conditions
      const includeConditions = [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'firstName', 'profileImage']
        },
        {
          model: User,
          as: 'members',
          through: { 
            where: { isActive: true },
            attributes: []
          },
          attributes: ['id'],
          required: false
        },
        {
          model: Interest,
          as: 'interests',
          through: { attributes: [] },
          required: false
        }
      ];

      // Filter by interests
      if (interests.trim()) {
        const interestIds = interests.split(',').filter(id => id.trim());
        if (interestIds.length > 0) {
          includeConditions[2].where = {
            id: { [Op.in]: interestIds }
          };
          includeConditions[2].required = true;
        }
      }

      const rooms = await Room.findAndCountAll({
        where: whereConditions,
        include: includeConditions,
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true
      });

      // Format response with member counts
      const roomsWithMetadata = rooms.rows.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        topic: room.topic,
        technologies: room.technologies,
        maxParticipants: room.maxParticipants,
        currentParticipants: room.members.length,
        roomCode: room.roomCode,
        owner: room.owner,
        interests: room.interests,
        createdAt: room.createdAt,
        isJoinable: room.members.length < room.maxParticipants
      }));

      res.json({
        success: true,
        data: {
          rooms: roomsWithMetadata,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(rooms.count / limit),
            totalItems: rooms.count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get public rooms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch rooms'
      });
    }
  }

  // Get room by ID or code
  async getRoom(req, res) {
    try {
      const { id } = req.params;
      
      // Determine if searching by ID or room code
      const whereCondition = id.match(/^[0-9a-fA-F-]{36}$/) 
        ? { id } 
        : { roomCode: id.toUpperCase() };

      const room = await Room.findOne({
        where: {
          ...whereCondition,
          isActive: true
        },
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          },
          {
            model: User,
            as: 'members',
            through: { 
              where: { isActive: true },
              attributes: ['role', 'joinedAt', 'contributionCount']
            },
            attributes: ['id', 'username', 'firstName', 'profileImage']
          },
          {
            model: Interest,
            as: 'interests',
            through: { attributes: [] }
          }
        ]
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found'
        });
      }

      // Check if user has access (public room or member)
      const user = req.user;
      const isMember = room.members.some(member => member.id === user.id);
      
      if (!room.isPublic && !isMember) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to private room'
        });
      }

      // Get current content from Valkey
      const roomContent = await valkeyClient.getRoomContent(room.id);

      res.json({
        success: true,
        data: { 
          room: {
            ...room.toJSON(),
            content: roomContent,
            currentParticipants: room.members.length,
            isJoinable: room.members.length < room.maxParticipants,
            userIsMember: isMember
          }
        }
      });

    } catch (error) {
      console.error('Get room error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch room'
      });
    }
  }

  // Update room (only by owner)
  async update(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const room = await Room.findOne({
        where: { 
          id, 
          ownerId: user.id,
          isActive: true 
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found or unauthorized'
        });
      }

      const {
        name,
        description,
        topic,
        maxParticipants,
        isPublic,
        technologies,
        interests
      } = req.body;

      // Update basic fields
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (topic !== undefined) updateData.topic = topic;
      if (maxParticipants !== undefined) updateData.maxParticipants = maxParticipants;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (technologies !== undefined) updateData.technologies = technologies;

      await room.update(updateData);

      // Update interests if provided
      if (interests && Array.isArray(interests)) {
        const validInterests = await Interest.findAll({
          where: { 
            id: { [Op.in]: interests },
            isActive: true 
          }
        });

        await room.setInterests(validInterests.map(i => i.id));
      }

      // Update Valkey data
      await valkeyClient.setRoomData(room.id, {
        name: room.name,
        topic: room.topic,
        updatedAt: new Date().toISOString()
      });

      // Fetch updated room
      const updatedRoom = await Room.findByPk(room.id, {
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'firstName', 'profileImage']
          },
          {
            model: Interest,
            as: 'interests',
            through: { attributes: [] }
          }
        ]
      });

      res.json({
        success: true,
        message: 'Room updated successfully',
        data: { room: updatedRoom }
      });

    } catch (error) {
      console.error('Update room error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update room'
      });
    }
  }

  // End room (only by owner)
  async endRoom(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const room = await Room.findOne({
        where: { 
          id, 
          ownerId: user.id,
          isActive: true 
        }
      });

      if (!room) {
        return res.status(404).json({
          success: false,
          message: 'Room not found or unauthorized'
        });
      }

      // Mark room as ended
      await room.update({ 
        isActive: false,
        endedAt: new Date()
      });

      // Mark all active members as left
      await RoomMember.update(
        { 
          leftAt: new Date(),
          isActive: false 
        },
        {
          where: {
            roomId: room.id,
            isActive: true
          }
        }
      );

      // Clean up Valkey data
      await valkeyClient.deleteRoom(room.id);

      res.json({
        success: true,
        message: 'Room ended successfully'
      });

    } catch (error) {
      console.error('End room error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to end room'
      });
    }
  }

  // Get user's room history
  async getUserRooms(req, res) {
    try {
      const user = req.user;
      const { page = 1, limit = 20, status = 'all' } = req.query;
      const offset = (page - 1) * limit;

      let whereCondition = {};
      if (status === 'active') {
        whereCondition.isActive = true;
      } else if (status === 'ended') {
        whereCondition.isActive = false;
      }

      const rooms = await Room.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: User,
            as: 'members',
            where: { id: user.id },
            through: { attributes: ['role', 'joinedAt', 'leftAt', 'contributionCount'] },
            attributes: []
          },
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'username', 'firstName', 'profileImage']
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          rooms: rooms.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(rooms.count / limit),
            totalItems: rooms.count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get user rooms error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user rooms'
      });
    }
  }
}

module.exports = new RoomController();
