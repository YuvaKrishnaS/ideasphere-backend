const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Bit = sequelize.define('Bit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 200],
        notEmpty: true
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 2000],
        notEmpty: true
      }
    },
    type: {
      type: DataTypes.ENUM('text', 'code', 'image', 'link'),
      defaultValue: 'text'
    },
    technologies: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    likesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    commentsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    viewsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    isReported: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isFlagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    slug: {
      type: DataTypes.STRING,
      unique: true
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['type'] },
      { fields: ['technologies'] },
      { fields: ['tags'] },
      { fields: ['createdAt'] },
      { fields: ['likesCount'] },
      { fields: ['isPublic'] }
    ]
  });

  Bit.associate = (models) => {
    Bit.belongsTo(models.User, { 
      foreignKey: 'userId',
      as: 'author'
    });
    
    Bit.hasMany(models.BitLike, {
      foreignKey: 'bitId',
      as: 'likes'
    });
    
    Bit.hasMany(models.BitComment, {
      foreignKey: 'bitId',
      as: 'comments'
    });
    
    Bit.hasMany(models.Report, {
      foreignKey: 'contentId',
      constraints: false,
      scope: {
        contentType: 'bit'
      },
      as: 'reports'
    });
  };

  return Bit;
};
