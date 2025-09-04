const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Stack = sequelize.define('Stack', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 300],
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    difficulty: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      defaultValue: 'beginner'
    },
    estimatedTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },
    technologies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    prerequisites: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    steps: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    resources: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    completionsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00
    },
    ratingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    slug: {
      type: DataTypes.STRING,
      unique: true
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['difficulty'] },
      { fields: ['technologies'] },
      { fields: ['isPublished'] },
      { fields: ['isApproved'] },
      { fields: ['rating'] },
      { fields: ['createdAt'] }
    ]
  });

  Stack.associate = (models) => {
    Stack.belongsTo(models.User, { 
      foreignKey: 'userId',
      as: 'author'
    });
    
    Stack.hasMany(models.StackLike, {
      foreignKey: 'stackId',
      as: 'likes'
    });
    
    Stack.hasMany(models.StackRating, {
      foreignKey: 'stackId',
      as: 'ratings'
    });
    
    Stack.hasMany(models.Report, {
      foreignKey: 'contentId',
      constraints: false,
      scope: {
        contentType: 'stack'
      },
      as: 'reports'
    });
  };

  return Stack;
};
