const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    reporterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    reportedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    contentType: {
      type: DataTypes.ENUM('user', 'bit', 'stack', 'comment', 'chat_message', 'room'),
      allowNull: false
    },
    contentId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    reason: {
      type: DataTypes.ENUM(
        'spam',
        'harassment',
        'inappropriate_content',
        'fake_information',
        'violence',
        'hate_speech',
        'copyright',
        'other'
      ),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [10, 1000]
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed'),
      defaultValue: 'pending'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    actionTaken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reviewedById: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['reporterId'] },
      { fields: ['reportedUserId'] },
      { fields: ['contentType'] },
      { fields: ['contentId'] },
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields: ['createdAt'] }
    ]
  });

  Report.associate = (models) => {
    Report.belongsTo(models.User, {
      foreignKey: 'reporterId',
      as: 'reporter'
    });
    
    Report.belongsTo(models.User, {
      foreignKey: 'reportedUserId',
      as: 'reportedUser'
    });
    
    Report.belongsTo(models.User, {
      foreignKey: 'reviewedById',
      as: 'reviewer'
    });
  };

  return Report;
};
