const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserInteraction = sequelize.define('UserInteraction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    contentType: {
      type: DataTypes.ENUM('bit', 'stack', 'user', 'room'),
      allowNull: false
    },
    contentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    interactionType: {
      type: DataTypes.ENUM('view', 'like', 'comment', 'share', 'bookmark', 'follow', 'join', 'complete'),
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER, // Time spent viewing (in seconds)
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    score: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 1.0 // Weighted interaction score
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['contentType', 'contentId'] },
      { fields: ['interactionType'] },
      { fields: ['createdAt'] }
    ]
  });

  UserInteraction.associate = (models) => {
    UserInteraction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return UserInteraction;
};
