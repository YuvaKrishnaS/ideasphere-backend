require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize with Railway PostgreSQL or fallback
let sequelize;

if (process.env.DATABASE_URL) {
  // Production: Railway PostgreSQL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // Development: Local SQLite fallback
  console.log('⚠️ No DATABASE_URL found, using SQLite fallback');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });
}

// Define all models inline (safer for deployment)
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30],
      isAlphanumeric: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profileImage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  githubProfile: {
    type: DataTypes.STRING,
    allowNull: true
  },
  linkedinProfile: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  interests: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin'),
    defaultValue: 'user'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  emailVerificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

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
      len: [1, 200]
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
    type: DataTypes.ENUM('text', 'code', 'image', 'link'),
    defaultValue: 'text'
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  technologies: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isFlagged: {
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
  commentsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'bits',
  timestamps: true
});

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
      len: [1, 300]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [10, 1000]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
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
    type: DataTypes.JSON,
    defaultValue: []
  },
  prerequisites: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  steps: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  resources: {
    type: DataTypes.JSON,
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
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0
  },
  ratingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'stacks',
  timestamps: true
});

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
      model: 'users',
      key: 'id'
    }
  },
  followingId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notificationsEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'follows',
  timestamps: true,
  indexes: [
    { fields: ['followerId'] },
    { fields: ['followingId'] },
    { fields: ['followerId', 'followingId'], unique: true }
  ]
});

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
      model: 'users',
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
    type: DataTypes.DECIMAL(10, 2),
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
    allowNull: true
  }
}, {
  tableName: 'user_reputations',
  timestamps: true
});

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
      model: 'users',
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
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  score: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 1.0
  }
}, {
  tableName: 'user_interactions',
  timestamps: true
});

const BitLike = sequelize.define('BitLike', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  bitId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bits',
      key: 'id'
    }
  }
}, {
  tableName: 'bit_likes',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'bitId'], unique: true }
  ]
});

const StackLike = sequelize.define('StackLike', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  stackId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'stacks',
      key: 'id'
    }
  }
}, {
  tableName: 'stack_likes',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'stackId'], unique: true }
  ]
});

const StackRating = sequelize.define('StackRating', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  stackId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'stacks',
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  tableName: 'stack_ratings',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'stackId'], unique: true }
  ]
});

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
      model: 'users',
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
    type: DataTypes.JSON,
    defaultValue: {}
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'file_uploads',
  timestamps: true
});

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
      model: 'users',
      key: 'id'
    }
  },
  reportedUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
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
    type: DataTypes.ENUM('spam', 'harassment', 'inappropriate_content', 'fake_information', 'violence', 'hate_speech', 'copyright', 'other'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'under_review', 'resolved', 'dismissed'),
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  actionTaken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reviewedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'reports',
  timestamps: true
});

// Your Original Models (keeping for compatibility)
const Interest = sequelize.define('Interest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'interests',
  timestamps: true
});

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'projects',
  timestamps: true
});

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'rooms',
  timestamps: true
});

const RoomMember = sequelize.define('RoomMember', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('member', 'moderator', 'admin'),
    defaultValue: 'member'
  }
}, {
  tableName: 'room_members',
  timestamps: true
});

// Junction Models
const UserInterest = sequelize.define('UserInterest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  proficiencyLevel: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    defaultValue: 'beginner'
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'user_interests',
  timestamps: true
});

const ProjectInterest = sequelize.define('ProjectInterest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  }
}, {
  tableName: 'project_interests',
  timestamps: true
});

const ProjectLike = sequelize.define('ProjectLike', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  }
}, {
  tableName: 'project_likes',
  timestamps: true
});

const ProjectBookmark = sequelize.define('ProjectBookmark', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  }
}, {
  tableName: 'project_bookmarks',
  timestamps: true
});

const UserFollow = sequelize.define('UserFollow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  }
}, {
  tableName: 'user_follows',
  timestamps: true
});

// Set up associations
function setupAssociations() {
  // User associations
  User.hasOne(UserReputation, { foreignKey: 'userId', as: 'reputation' });
  UserReputation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Bit, { foreignKey: 'userId', as: 'bits' });
  Bit.belongsTo(User, { foreignKey: 'userId', as: 'author' });

  User.hasMany(Stack, { foreignKey: 'userId', as: 'stacks' });
  Stack.belongsTo(User, { foreignKey: 'userId', as: 'author' });

  User.hasMany(UserInteraction, { foreignKey: 'userId', as: 'interactions' });
  UserInteraction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(FileUpload, { foreignKey: 'userId', as: 'uploads' });
  FileUpload.belongsTo(User, { foreignKey: 'userId', as: 'uploader' });

  // Follow associations
  Follow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
  Follow.belongsTo(User, { foreignKey: 'followingId', as: 'following' });

  // Bit associations
  User.belongsToMany(Bit, { through: BitLike, as: 'likedBits', foreignKey: 'userId', otherKey: 'bitId' });
  Bit.belongsToMany(User, { through: BitLike, as: 'likedBy', foreignKey: 'bitId', otherKey: 'userId' });

  // Stack associations
  User.belongsToMany(Stack, { through: StackLike, as: 'likedStacks', foreignKey: 'userId', otherKey: 'stackId' });
  Stack.belongsToMany(User, { through: StackLike, as: 'likedBy', foreignKey: 'stackId', otherKey: 'userId' });

  User.belongsToMany(Stack, { through: StackRating, as: 'ratedStacks', foreignKey: 'userId', otherKey: 'stackId' });
  Stack.belongsToMany(User, { through: StackRating, as: 'ratedBy', foreignKey: 'stackId', otherKey: 'userId' });

  // Report associations
  Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
  Report.belongsTo(User, { foreignKey: 'reportedUserId', as: 'reportedUser' });
  Report.belongsTo(User, { foreignKey: 'reviewedById', as: 'reviewer' });

  // Original associations (keeping for compatibility)
  User.belongsToMany(Interest, { through: UserInterest, as: 'interests', foreignKey: 'userId', otherKey: 'interestId' });
  Interest.belongsToMany(User, { through: UserInterest, as: 'users', foreignKey: 'interestId', otherKey: 'userId' });

  User.hasMany(Project, { foreignKey: 'userId', as: 'projects' });
  Project.belongsTo(User, { foreignKey: 'userId', as: 'author' });

  Project.belongsToMany(Interest, { through: ProjectInterest, as: 'interests', foreignKey: 'projectId', otherKey: 'interestId' });
  Interest.belongsToMany(Project, { through: ProjectInterest, as: 'projects', foreignKey: 'interestId', otherKey: 'projectId' });

  User.belongsToMany(Project, { through: ProjectLike, as: 'likedProjects', foreignKey: 'userId', otherKey: 'projectId' });
  Project.belongsToMany(User, { through: ProjectLike, as: 'likedByUsers', foreignKey: 'projectId', otherKey: 'userId' });

  User.belongsToMany(Project, { through: ProjectBookmark, as: 'bookmarkedProjects', foreignKey: 'userId', otherKey: 'projectId' });
  Project.belongsToMany(User, { through: ProjectBookmark, as: 'bookmarkedByUsers', foreignKey: 'projectId', otherKey: 'userId' });

  User.belongsToMany(User, { through: UserFollow, as: 'following', foreignKey: 'followerId', otherKey: 'followingId' });
  User.belongsToMany(User, { through: UserFollow, as: 'followers', foreignKey: 'followingId', otherKey: 'followerId' });

  User.hasMany(Room, { foreignKey: 'ownerId', as: 'ownedRooms' });
  Room.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

  User.belongsToMany(Room, { through: RoomMember, as: 'joinedRooms', foreignKey: 'userId', otherKey: 'roomId' });
  Room.belongsToMany(User, { through: RoomMember, as: 'members', foreignKey: 'roomId', otherKey: 'userId' });

  Room.belongsToMany(Interest, { through: 'RoomInterests', as: 'interests', foreignKey: 'roomId', otherKey: 'interestId' });
  Interest.belongsToMany(Room, { through: 'RoomInterests', as: 'rooms', foreignKey: 'interestId', otherKey: 'roomId' });

  console.log('✅ Database associations configured successfully');
}

// Initialize associations
setupAssociations();

// Export everything
module.exports = {
  sequelize,
  Sequelize,
  // IdeaSphere Core Models
  User,
  Bit,
  Stack,
  Follow,
  UserReputation,
  UserInteraction,
  BitLike,
  StackLike,
  StackRating,
  FileUpload,
  Report,
  // Original Models (for compatibility)
  Interest,
  Project,
  Room,
  RoomMember,
  UserInterest,
  ProjectInterest,
  ProjectLike,
  ProjectBookmark,
  UserFollow
};
