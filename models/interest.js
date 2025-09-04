const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Interest extends Model {}

Interest.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [2, 50],
        msg: 'Interest name must be between 2-50 characters'
      }
    }
  },
  slug: {
    type: DataTypes.STRING(60),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    validate: {
      len: {
        args: [0, 200],
        msg: 'Description cannot exceed 200 characters'
      }
    }
  },
  category: {
    type: DataTypes.ENUM(
      'technology',
      'design',
      'business',
      'science',
      'arts',
      'languages',
      'sports',
      'other'
    ),
    allowNull: false,
    defaultValue: 'technology'
  },
  color: {
    type: DataTypes.STRING(7),
    validate: {
      is: {
        args: /^#[0-9A-F]{6}$/i,
        msg: 'Color must be a valid hex color code'
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  sequelize,
  modelName: 'Interest',
  tableName: 'interests',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['slug']
    },
    {
      fields: ['category']
    },
    {
      fields: ['isActive']
    }
  ],
  hooks: {
    beforeValidate: function(interest) {
      if (interest.name && !interest.slug) {
        interest.slug = interest.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      }
    }
  }
});

module.exports = Interest;
