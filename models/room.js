const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Room extends Model {}

Room.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: {
        args: [3, 100],
        msg: 'Room name must be between 3-100 characters'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    validate: {
      len: {
        args: [0, 500],
        msg: 'Description cannot exceed 500 characters'
      }
    }
  },
  topic: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: {
        args: [3, 200],
        msg: 'Topic must be between 3-200 characters'
      }
    }
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    validate: {
      min: {
        args: 2,
        msg: 'Room must allow at least 2 participants'
      },
      max: {
        args: 50,
        msg: 'Room cannot exceed 50 participants'
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  roomCode: {
    type: DataTypes.STRING(8),
    unique: true,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  technologies: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  endedAt: {
    type: DataTypes.DATE
  }
}, {
  sequelize,
  modelName: 'Room',
  tableName: 'rooms',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['roomCode']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['isPublic']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: function(room) {
      if (!room.roomCode) {
        room.roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      }
    }
  }
});

module.exports = Room;
