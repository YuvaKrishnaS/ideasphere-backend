const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, Room, RoomMember } = require('../models');
const valkeyClient = require('../config/valkey');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // socketId -> userId mapping
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
          attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
        });

        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`✅ User ${socket.user.username} connected: ${socket.id}`);
      this.connectedUsers.set(socket.id, socket.userId);

      this.handleRoomEvents(socket);
      this.handleCollaborationEvents(socket);
      this.handleDisconnection(socket);
    });

    console.log('✅ Socket.IO service initialized');
  }

  handleRoomEvents(socket) {
    // Join room
    socket.on('join-room', async (data) => {
      try {
        const { roomId } = data;
        
        // Verify user can join room
        const room = await Room.findByPk(roomId, {
          include: [
            {
              model: User,
              as: 'members',
              through: { 
                where: { isActive: true },
                attributes: ['role', 'joinedAt']
              }
            }
          ]
        });

        if (!room || !room.isActive) {
          socket.emit('room-error', { message: 'Room not found or inactive' });
          return;
        }

        // Check if user is already a member or if room is public
        const isMember = room.members.some(member => member.id === socket.userId);
        const currentMemberCount = room.members.length;

        if (!isMember && !room.isPublic) {
          socket.emit('room-error', { message: 'Room is private' });
          return;
        }

        if (!isMember && currentMemberCount >= room.maxParticipants) {
          socket.emit('room-error', { message: 'Room is full' });
          return;
        }

        // Add user to room if not already a member
        if (!isMember) {
          await RoomMember.create({
            roomId: room.id,
            userId: socket.userId,
            role: 'participant'
          });
        }

        // Join socket room
        socket.join(roomId);
        socket.currentRoom = roomId;

        // Add user to Valkey room data
        await valkeyClient.addUserToRoom(roomId, socket.userId, {
          username: socket.user.username,
          firstName: socket.user.firstName,
          profileImage: socket.user.profileImage,
          joinedAt: new Date().toISOString(),
          socketId: socket.id
        });

        // Get current room content and users
        const [roomContent, roomUsers] = await Promise.all([
          valkeyClient.getRoomContent(roomId),
          valkeyClient.getRoomUsers(roomId)
        ]);

        // Send room data to user
        socket.emit('room-joined', {
          room: {
            id: room.id,
            name: room.name,
            description: room.description,
            topic: room.topic,
            content: roomContent
          },
          users: roomUsers
        });

        // Notify other users
        socket.to(roomId).emit('user-joined', {
          userId: socket.userId,
          username: socket.user.username,
          firstName: socket.user.firstName,
          profileImage: socket.user.profileImage
        });

        console.log(`✅ User ${socket.user.username} joined room ${roomId}`);

      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('room-error', { message: 'Failed to join room' });
      }
    });

    // Leave room
    socket.on('leave-room', async (data) => {
      try {
        const { roomId } = data;
        await this.handleLeaveRoom(socket, roomId);
      } catch (error) {
        console.error('Leave room error:', error);
        socket.emit('room-error', { message: 'Failed to leave room' });
      }
    });

    // Get room list
    socket.on('get-rooms', async () => {
      try {
        const rooms = await Room.findAll({
          where: { 
            isActive: true,
            isPublic: true 
          },
          include: [
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
              attributes: ['id']
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: 20
        });

        const roomsWithMemberCount = rooms.map(room => ({
          id: room.id,
          name: room.name,
          description: room.description,
          topic: room.topic,
          technologies: room.technologies,
          memberCount: room.members.length,
          maxParticipants: room.maxParticipants,
          owner: room.owner,
          createdAt: room.createdAt
        }));

        socket.emit('rooms-list', { rooms: roomsWithMemberCount });

      } catch (error) {
        console.error('Get rooms error:', error);
        socket.emit('room-error', { message: 'Failed to get rooms' });
      }
    });
  }

  handleCollaborationEvents(socket) {
    // Content changes
    socket.on('content-change', async (data) => {
      try {
        const { roomId, content, operation } = data;
        
        if (socket.currentRoom !== roomId) {
          socket.emit('room-error', { message: 'Not in this room' });
          return;
        }

        // Save content to Valkey
        await valkeyClient.setRoomContent(roomId, content);

        // Broadcast to other users in room
        socket.to(roomId).emit('content-updated', {
          content,
          operation,
          userId: socket.userId,
          username: socket.user.username,
          timestamp: new Date().toISOString()
        });

        // Update contribution count
        await RoomMember.increment('contributionCount', {
          where: {
            roomId,
            userId: socket.userId
          }
        });

      } catch (error) {
        console.error('Content change error:', error);
        socket.emit('room-error', { message: 'Failed to update content' });
      }
    });

    // Cursor position
    socket.on('cursor-position', (data) => {
      try {
        const { roomId, position, selection } = data;
        
        if (socket.currentRoom !== roomId) return;

        socket.to(roomId).emit('cursor-updated', {
          userId: socket.userId,
          username: socket.user.username,
          position,
          selection,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Cursor position error:', error);
      }
    });

    // Chat messages in room
    socket.on('room-message', async (data) => {
      try {
        const { roomId, message } = data;
        
        if (socket.currentRoom !== roomId) {
          socket.emit('room-error', { message: 'Not in this room' });
          return;
        }

        if (!message || message.trim().length === 0) {
          socket.emit('room-error', { message: 'Message cannot be empty' });
          return;
        }

        const messageData = {
          id: require('uuid').v4(),
          userId: socket.userId,
          username: socket.user.username,
          firstName: socket.user.firstName,
          profileImage: socket.user.profileImage,
          message: message.trim(),
          timestamp: new Date().toISOString()
        };

        // Broadcast to all users in room (including sender)
        this.io.to(roomId).emit('room-message', messageData);

      } catch (error) {
        console.error('Room message error:', error);
        socket.emit('room-error', { message: 'Failed to send message' });
      }
    });
  }

  handleDisconnection(socket) {
    socket.on('disconnect', async () => {
      try {
        console.log(`❌ User ${socket.user.username} disconnected: ${socket.id}`);
        
        // Remove from connected users
        this.connectedUsers.delete(socket.id);

        // Handle room cleanup
        if (socket.currentRoom) {
          await this.handleLeaveRoom(socket, socket.currentRoom);
        }

      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
    });
  }

  async handleLeaveRoom(socket, roomId) {
    if (!roomId) return;

    try {
      // Remove from socket room
      socket.leave(roomId);

      // Remove from Valkey room data
      await valkeyClient.removeUserFromRoom(roomId, socket.userId);

      // Update database
      await RoomMember.update(
        { 
          leftAt: new Date(),
          isActive: false 
        },
        {
          where: {
            roomId,
            userId: socket.userId,
            isActive: true
          }
        }
      );

      // Notify other users
      socket.to(roomId).emit('user-left', {
        userId: socket.userId,
        username: socket.user.username
      });

      socket.currentRoom = null;
      
      console.log(`✅ User ${socket.user.username} left room ${roomId}`);

    } catch (error) {
      console.error('Handle leave room error:', error);
      throw error;
    }
  }

  // Method to emit to specific user
  emitToUser(userId, event, data) {
    const userSockets = Array.from(this.connectedUsers.entries())
      .filter(([socketId, uId]) => uId === userId)
      .map(([socketId]) => socketId);

    userSockets.forEach(socketId => {
      this.io.to(socketId).emit(event, data);
    });
  }

  // Method to emit to room
  emitToRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }
}

module.exports = new SocketService();
