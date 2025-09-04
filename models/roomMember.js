const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class RoomMember extends Model {}

RoomMember.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  role: {
    type: DataTypes.ENUM('owner', 'moderator', 'participant'),
    defaultValue: 'participant'
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  leftAt: {
    type: DataTypes.DATE
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  contributionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  sequelize,
  modelName: 'RoomMember',
  tableName: 'room_members',
  timestamps: true,
  indexes: [
    {
      fields: ['roomId', 'userId'],
      unique: true
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = RoomMember;
