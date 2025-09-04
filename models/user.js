const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

class User extends Model {
  async validatePassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  async hashPassword() {
    if (this.changed('password')) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  toJSON() {
    const values = { ...this.get() };
    delete values.password;
    delete values.deletedAt;
    return values;
  }
}

User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: {
      name: 'unique_username',
      msg: 'Username already exists'
    },
    validate: {
      len: {
        args: [3, 30],
        msg: 'Username must be between 3-30 characters'
      },
      isAlphanumeric: {
        msg: 'Username can only contain letters and numbers'
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      name: 'unique_email',
      msg: 'Email already exists'
    },
    validate: {
      isEmail: {
        msg: 'Must be a valid email address'
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [8, 128],
        msg: 'Password must be at least 8 characters'
      }
    }
  },
  firstName: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: {
        args: [1, 50],
        msg: 'First name is required'
      }
    }
  },
  lastName: {
    type: DataTypes.STRING(50),
    validate: {
      len: {
        args: [0, 50],
        msg: 'Last name cannot exceed 50 characters'
      }
    }
  },
  bio: {
    type: DataTypes.TEXT,
    validate: {
      len: {
        args: [0, 500],
        msg: 'Bio cannot exceed 500 characters'
      }
    }
  },
  profileImage: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'Profile image must be a valid URL'
      }
    }
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    validate: {
      isDate: true,
      isBefore: {
        args: new Date().toISOString().split('T')[0],
        msg: 'Date of birth must be in the past'
      }
    }
  },
  location: {
    type: DataTypes.STRING(100)
  },
  website: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'Website must be a valid URL'
      }
    }
  },
  githubProfile: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'GitHub profile must be a valid URL'
      }
    }
  },
  linkedinProfile: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'LinkedIn profile must be a valid URL'
      }
    }
  },
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastLoginAt: {
    type: DataTypes.DATE
  },
  emailVerificationToken: {
    type: DataTypes.STRING
  },
  passwordResetToken: {
    type: DataTypes.STRING
  },
  passwordResetExpires: {
    type: DataTypes.DATE
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emailVerificationExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
  }, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['username']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeSave: async function(user) {
      await user.hashPassword();
    }
  }
});

module.exports = User;
