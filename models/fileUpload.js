const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FileUpload = sequelize.define('FileUpload', {
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
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mimetype: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    category: {
      type: DataTypes.ENUM('profile_image', 'bit_image', 'stack_image', 'document', 'avatar', 'cover', 'misc'),
      defaultValue: 'misc'
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['category'] },
      { fields: ['mimetype'] },
      { fields: ['fileName'] }
    ]
  });

  FileUpload.associate = (models) => {
    FileUpload.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'uploader'
    });
  };

  return FileUpload;
};
