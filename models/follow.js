const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Follow = sequelize.define('Follow', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    followerId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    followingId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    notificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['followerId'] },
      { fields: ['followingId'] },
      { fields: ['followerId', 'followingId'], unique: true } // Prevent duplicate follows
    ]
  });

  Follow.associate = (models) => {
    Follow.belongsTo(models.User, {
      foreignKey: 'followerId',
      as: 'follower'
    });
    
    Follow.belongsTo(models.User, {
      foreignKey: 'followingId',
      as: 'following'
    });
  };

  return Follow;
};
