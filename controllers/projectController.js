const { Project, Interest, User, UserInterest, ProjectLike, ProjectBookmark } = require('../models');
const { Op } = require('sequelize');

class ProjectController {
  // Get projects with pagination, filtering, and search
  async getAll(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        type = '', 
        difficulty = '', 
        interests = '', 
        search = '', 
        userId = '',
        sortBy = 'newest'
      } = req.query;

      const offset = (page - 1) * limit;
      const parsedLimit = Math.min(parseInt(limit), 50); // Max 50 per page

      // Build where conditions
      const whereConditions = {
        status: 'published'
      };

      if (type) {
        whereConditions.type = type;
      }

      if (difficulty) {
        whereConditions.difficulty = difficulty;
      }

      if (userId) {
        whereConditions.userId = userId;
      }

      if (search.trim()) {
        whereConditions[Op.or] = [
          { title: { [Op.iLike]: `%${search.trim()}%` } },
          { description: { [Op.iLike]: `%${search.trim()}%` } },
          { technologies: { [Op.contains]: [search.trim()] } }
        ];
      }

      // Build include conditions
      const includeConditions = [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
        },
        {
          model: Interest,
          as: 'interests',
          through: { attributes: [] }
        }
      ];

      // Filter by interests
      if (interests.trim()) {
        const interestIds = interests.split(',').filter(id => id.trim());
        if (interestIds.length > 0) {
          includeConditions[1].where = {
            id: { [Op.in]: interestIds }
          };
          includeConditions[1].required = true;
        }
      }

      // Sorting options
      let orderBy;
      switch (sortBy) {
        case 'popular':
          orderBy = [['likeCount', 'DESC'], ['viewCount', 'DESC']];
          break;
        case 'views':
          orderBy = [['viewCount', 'DESC']];
          break;
        case 'oldest':
          orderBy = [['publishedAt', 'ASC']];
          break;
        default: // newest
          orderBy = [['publishedAt', 'DESC']];
      }

      const projects = await Project.findAndCountAll({
        where: whereConditions,
        include: includeConditions,
        limit: parsedLimit,
        offset,
        order: orderBy,
        distinct: true
      });

      res.json({
        success: true,
        data: {
          projects: projects.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(projects.count / parsedLimit),
            totalItems: projects.count,
            itemsPerPage: parsedLimit,
            hasNext: page * parsedLimit < projects.count,
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to fetch projects'
      });
    }
  }

  // Get personalized feed based on user interests
  async getFeed(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const user = req.user;

      // Get user's interests
      const userInterests = await UserInterest.findAll({
        where: { userId: user.id },
        attributes: ['interestId']
      });

      if (userInterests.length === 0) {
        // If user has no interests, return recent projects
        return this.getAll(req, res);
      }

      const interestIds = userInterests.map(ui => ui.interestId);

      const projects = await Project.findAndCountAll({
        where: { status: 'published' },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          },
          {
            model: Interest,
            as: 'interests',
            where: { id: { [Op.in]: interestIds } },
            through: { attributes: [] },
            required: true
          }
        ],
        limit: parseInt(limit),
        offset,
        order: [['publishedAt', 'DESC']],
        distinct: true
      });

      res.json({
        success: true,
        data: {
          projects: projects.rows,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(projects.count / limit),
            totalItems: projects.count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get feed error:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to fetch personalized feed'
      });
    }
  }

  // Create new project
  async create(req, res) {
    try {
      const {
        title,
        description,
        content,
        type = 'project',
        difficulty = 'beginner',
        thumbnailImage,
        images = [],
        videoUrl,
        githubRepo,
        liveUrl,
        technologies = [],
        estimatedTime,
        isCollaborative = false,
        maxCollaborators,
        interests = []
      } = req.body;

      const user = req.user;

      // Generate unique slug
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const uniqueSlug = `${baseSlug}-${Date.now()}`;

      // Validate interests
      if (interests.length > 0) {
        const validInterests = await Interest.findAll({
          where: { 
            id: { [Op.in]: interests },
            isActive: true 
          }
        });

        if (validInterests.length !== interests.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more invalid interest IDs provided'
          });
        }
      }

      const project = await Project.create({
        title,
        description,
        content,
        type,
        difficulty,
        thumbnailImage,
        images,
        videoUrl,
        githubRepo,
        liveUrl,
        technologies,
        estimatedTime,
        isCollaborative,
        maxCollaborators,
        slug: uniqueSlug,
        userId: user.id,
        status: 'published',
        publishedAt: new Date()
      });

      // Associate interests
      if (interests.length > 0) {
        await project.setInterests(interests);
      }

      // Fetch project with associations
      const createdProject = await Project.findByPk(project.id, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          },
          {
            model: Interest,
            as: 'interests',
            through: { attributes: [] }
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project: createdProject }
      });

    } catch (error) {
      console.error('Create project error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create project'
      });
    }
  }

  // Get project by ID or slug
  async getById(req, res) {
    try {
      const { id } = req.params;
      
      // Determine if ID is UUID or slug
      const whereCondition = id.match(/^[0-9a-fA-F-]{36}$/) 
        ? { id } 
        : { slug: id };

      const project = await Project.findOne({
        where: {
          ...whereCondition,
          status: 'published'
        },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'bio']
          },
          {
            model: Interest,
            as: 'interests',
            through: { attributes: [] }
          }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      // Increment view count
      await project.increment('viewCount');

      // Check if user liked/bookmarked (if authenticated)
      let userInteractions = {};
      if (req.user) {
        const [liked, bookmarked] = await Promise.all([
          ProjectLike.findOne({ 
            where: { 
              userId: req.user.id, 
              projectId: project.id 
            } 
          }),
          ProjectBookmark.findOne({ 
            where: { 
              userId: req.user.id, 
              projectId: project.id 
            } 
          })
        ]);

        userInteractions = {
          isLiked: !!liked,
          isBookmarked: !!bookmarked
        };
      }

      res.json({
        success: true,
        data: { 
          project,
          userInteractions
        }
      });

    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project'
      });
    }
  }

  // Update project (only by owner)
  async update(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const project = await Project.findOne({
        where: { 
          id, 
          userId: user.id 
        }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found or unauthorized'
        });
      }

      const {
        title,
        description,
        content,
        type,
        difficulty,
        thumbnailImage,
        images,
        videoUrl,
        githubRepo,
        liveUrl,
        technologies,
        estimatedTime,
        isCollaborative,
        maxCollaborators,
        interests
      } = req.body;

      // Update basic fields
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (content !== undefined) updateData.content = content;
      if (type !== undefined) updateData.type = type;
      if (difficulty !== undefined) updateData.difficulty = difficulty;
      if (thumbnailImage !== undefined) updateData.thumbnailImage = thumbnailImage;
      if (images !== undefined) updateData.images = images;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
      if (githubRepo !== undefined) updateData.githubRepo = githubRepo;
      if (liveUrl !== undefined) updateData.liveUrl = liveUrl;
      if (technologies !== undefined) updateData.technologies = technologies;
      if (estimatedTime !== undefined) updateData.estimatedTime = estimatedTime;
      if (isCollaborative !== undefined) updateData.isCollaborative = isCollaborative;
      if (maxCollaborators !== undefined) updateData.maxCollaborators = maxCollaborators;

      await project.update(updateData);

      // Update interests if provided
      if (interests && Array.isArray(interests)) {
        const validInterests = await Interest.findAll({
          where: { 
            id: { [Op.in]: interests },
            isActive: true 
          }
        });

        if (validInterests.length !== interests.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more invalid interest IDs provided'
          });
        }

        await project.setInterests(interests);
      }

      // Fetch updated project
      const updatedProject = await Project.findByPk(project.id, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          },
          {
            model: Interest,
            as: 'interests',
            through: { attributes: [] }
          }
        ]
      });

      res.json({
        success: true,
        message: 'Project updated successfully',
        data: { project: updatedProject }
      });

    } catch (error) {
      console.error('Update project error:', error);
      
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update project'
      });
    }
  }

  // Delete project (only by owner)
  async delete(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const project = await Project.findOne({
        where: { 
          id, 
          userId: user.id 
        }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found or unauthorized'
        });
      }

      await project.destroy();

      res.json({
        success: true,
        message: 'Project deleted successfully'
      });

    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project'
      });
    }
  }

  // Like/Unlike project
  async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const existingLike = await ProjectLike.findOne({
        where: { 
          userId: user.id, 
          projectId: id 
        }
      });

      if (existingLike) {
        // Unlike
        await existingLike.destroy();
        await project.decrement('likeCount');
        
        res.json({
          success: true,
          message: 'Project unliked',
          data: { isLiked: false }
        });
      } else {
        // Like
        await ProjectLike.create({
          userId: user.id,
          projectId: id
        });
        await project.increment('likeCount');
        
        res.json({
          success: true,
          message: 'Project liked',
          data: { isLiked: true }
        });
      }

    } catch (error) {
      console.error('Toggle like error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle like'
      });
    }
  }

  // Bookmark/Unbookmark project
  async toggleBookmark(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;

      const project = await Project.findByPk(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }

      const existingBookmark = await ProjectBookmark.findOne({
        where: { 
          userId: user.id, 
          projectId: id 
        }
      });

      if (existingBookmark) {
        // Remove bookmark
        await existingBookmark.destroy();
        await project.decrement('bookmarkCount');
        
        res.json({
          success: true,
          message: 'Bookmark removed',
          data: { isBookmarked: false }
        });
      } else {
        // Add bookmark
        await ProjectBookmark.create({
          userId: user.id,
          projectId: id
        });
        await project.increment('bookmarkCount');
        
        res.json({
          success: true,
          message: 'Project bookmarked',
          data: { isBookmarked: true }
        });
      }

    } catch (error) {
      console.error('Toggle bookmark error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle bookmark'
      });
    }
  }
}

module.exports = new ProjectController();
