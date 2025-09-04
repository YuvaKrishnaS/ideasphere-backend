const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Project extends Model {}

Project.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: {
        args: [5, 200],
        msg: 'Title must be between 5-200 characters'
      }
    }
  },
  slug: {
    type: DataTypes.STRING(250),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: {
        args: [20, 5000],
        msg: 'Description must be between 20-5000 characters'
      }
    }
  },
  content: {
    type: DataTypes.TEXT,
    validate: {
      len: {
        args: [0, 50000],
        msg: 'Content cannot exceed 50000 characters'
      }
    }
  },
  type: {
    type: DataTypes.ENUM('project', 'tutorial', 'showcase'),
    allowNull: false,
    defaultValue: 'project'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft'
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'beginner'
  },
  thumbnailImage: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'Thumbnail must be a valid URL'
      }
    }
  },
  images: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  videoUrl: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'Video URL must be valid'
      }
    }
  },
  githubRepo: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'GitHub repository must be a valid URL'
      }
    }
  },
  liveUrl: {
    type: DataTypes.STRING,
    validate: {
      isUrl: {
        msg: 'Live URL must be valid'
      }
    }
  },
  technologies: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  estimatedTime: {
    type: DataTypes.INTEGER,
    validate: {
      min: {
        args: 1,
        msg: 'Estimated time must be at least 1 minute'
      }
    }
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  likeCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  bookmarkCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  isCollaborative: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  maxCollaborators: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 50
    }
  },
  publishedAt: {
    type: DataTypes.DATE
  }
}, {
  sequelize,
  modelName: 'Project',
  tableName: 'projects',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['slug']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['difficulty']
    },
    {
      fields: ['publishedAt']
    },
    {
      fields: ['viewCount']
    },
    {
      fields: ['likeCount']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['userId']
    }
  ],
  hooks: {
    beforeValidate: function(project) {
      if (project.title && !project.slug) {
        const baseSlug = project.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        project.slug = `${baseSlug}-${Date.now()}`;
      }
      
      if (project.status === 'published' && !project.publishedAt) {
        project.publishedAt = new Date();
      }
    }
  }
});

module.exports = Project;
