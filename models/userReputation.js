const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserReputation = sequelize.define('UserReputation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    totalScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    bitsScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    stacksScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    chatScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    helpfulnessScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    badge: {
      type: DataTypes.ENUM('newcomer', 'contributor', 'experienced', 'expert', 'master'),
      defaultValue: 'newcomer'
    },
    canPostStacks: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    canModerateChats: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    warningsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastCalculatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['totalScore'] },
      { fields: ['level'] },
      { fields: ['badge'] }
    ]
  });

  UserReputation.associate = (models) => {
    UserReputation.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return UserReputation;
};
