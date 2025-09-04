const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Rooms',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 2000]
      }
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'file', 'code', 'system'),
      defaultValue: 'text'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    isEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isModerated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    moderatedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    moderationReason: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['roomId'] },
      { fields: ['userId'] },
      { fields: ['createdAt'] },
      { fields: ['isDeleted'] },
      { fields: ['isModerated'] }
    ]
  });

  ChatMessage.associate = (models) => {
    ChatMessage.belongsTo(models.Room, {
      foreignKey: 'roomId',
      as: 'room'
    });
    
    ChatMessage.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'sender'
    });
    
    ChatMessage.belongsTo(models.User, {
      foreignKey: 'moderatedById',
      as: 'moderator'
    });
    
    ChatMessage.hasMany(models.Report, {
      foreignKey: 'contentId',
      constraints: false,
      scope: {
        contentType: 'chat_message'
      },
      as: 'reports'
    });
  };

  return ChatMessage;
};
