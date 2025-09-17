require('dotenv').config();


const { Sequelize, DataTypes } = require('sequelize'); // Add DataTypes here
const sequelize = require('../config/database');

const User = require('./user');
const Interest = require('./interest');
const Project = require('./project');
const Room = require('./room');
const RoomMember = require('./roomMember');

// UserInterest model - many-to-many between User and Interest
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

// ProjectInterest model - many-to-many between Project and Interest
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

// ProjectLike model - many-to-many between User and Project for likes
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

// ProjectBookmark model - many-to-many between User and Project for bookmarks
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

// UserFollow model - many-to-many self relation for users following each other
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

let sequelize;
if (process.env.DATABASE_URL) {
  // Railway PostgreSQL connection
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
  // Local development fallback
  console.log('⚠️ No DATABASE_URL found, using SQLite fallback');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });
}
// Associations

User.belongsToMany(Interest, { 
  through: UserInterest, 
  as: 'interests',
  foreignKey: 'userId',
  otherKey: 'interestId'
});

Interest.belongsToMany(User, { 
  through: UserInterest, 
  as: 'users',
  foreignKey: 'interestId',
  otherKey: 'userId'
});

User.hasMany(Project, { 
  foreignKey: 'userId',
  as: 'projects'
});

Project.belongsTo(User, { 
  foreignKey: 'userId',
  as: 'author'
});

Project.belongsToMany(Interest, { 
  through: ProjectInterest, 
  as: 'interests',
  foreignKey: 'projectId',
  otherKey: 'interestId'
});

Interest.belongsToMany(Project, { 
  through: ProjectInterest, 
  as: 'projects',
  foreignKey: 'interestId',
  otherKey: 'projectId'
});

User.belongsToMany(Project, { 
  through: ProjectLike, 
  as: 'likedProjects',
  foreignKey: 'userId',
  otherKey: 'projectId'
});

Project.belongsToMany(User, { 
  through: ProjectLike, 
  as: 'likedByUsers',
  foreignKey: 'projectId',
  otherKey: 'userId'
});

User.belongsToMany(Project, { 
  through: ProjectBookmark, 
  as: 'bookmarkedProjects',
  foreignKey: 'userId',
  otherKey: 'projectId'
});

Project.belongsToMany(User, { 
  through: ProjectBookmark, 
  as: 'bookmarkedByUsers',
  foreignKey: 'projectId',
  otherKey: 'userId'
});

User.belongsToMany(User, { 
  through: UserFollow, 
  as: 'following',
  foreignKey: 'followerId',
  otherKey: 'followingId'
});

User.belongsToMany(User, { 
  through: UserFollow, 
  as: 'followers',
  foreignKey: 'followingId',
  otherKey: 'followerId'
});

User.hasMany(Room, { 
  foreignKey: 'ownerId',
  as: 'ownedRooms'
});

Room.belongsTo(User, { 
  foreignKey: 'ownerId',
  as: 'owner'
});

User.belongsToMany(Room, { 
  through: RoomMember,
  as: 'joinedRooms',
  foreignKey: 'userId',
  otherKey: 'roomId'
});

Room.belongsToMany(User, { 
  through: RoomMember,
  as: 'members',
  foreignKey: 'roomId',
  otherKey: 'userId'
});

Room.belongsToMany(Interest, { 
  through: 'RoomInterests',
  as: 'interests',
  foreignKey: 'roomId',
  otherKey: 'interestId'
});

Interest.belongsToMany(Room, { 
  through: 'RoomInterests',
  as: 'rooms',
  foreignKey: 'interestId',
  otherKey: 'roomId'
});



module.exports = {
  sequelize,
  User,
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
