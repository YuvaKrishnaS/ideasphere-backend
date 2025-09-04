const { Stack, User, StackLike, StackRating, UserReputation } = require('../models');
const { Op } = require('sequelize');
const reputationService = require('../services/reputationService');

class StackController {
  constructor() {
    this.createStack = this.createStack.bind(this);
    this.getStacks = this.getStacks.bind(this);
    this.getStackById = this.getStackById.bind(this);
    this.updateStack = this.updateStack.bind(this);
    this.deleteStack = this.deleteStack.bind(this);
    this.likeStack = this.likeStack.bind(this);
    this.rateStack = this.rateStack.bind(this);
    this.searchStacks = this.searchStacks.bind(this);
    this.approveStack = this.approveStack.bind(this);
  }

  // Create a new Stack (tutorial)
  async createStack(req, res) {
    try {
      const {
        title,
        description,
        content,
        difficulty,
        estimatedTime,
        technologies,
        prerequisites,
        steps,
        resources
      } = req.body;

      // Generate slug
      const slug = this.generateSlug(title);

      // Create stack
      const stack = await Stack.create({
        title,
        description,
        content,
        difficulty: difficulty || 'beginner',
        estimatedTime,
        technologies: technologies || [],
        prerequisites: prerequisites || [],
        steps: steps || [],
        resources: resources || [],
        userId: req.user.id,
        slug,
        isPublished: true,
        isApproved: false
      });

      // Add reputation points
      await reputationService.addPoints(req.user.id, 'STACK_CREATED');

      // Fetch stack with author info
      const createdStack = await Stack.findByPk(stack.id, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Stack created successfully and submitted for approval',
        data: { stack: createdStack }
      });

    } catch (error) {
      console.error('Create stack error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create stack'
      });
    }
  }

  // Get paginated stacks (only approved ones for public)
  async getStacks(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        difficulty,
        technology,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        showPending = false
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = { isPublished: true };

      // Only show approved stacks unless user is admin/moderator
      if (!showPending || (req.user?.role !== 'admin' && req.user?.role !== 'moderator')) {
        whereClause.isApproved = true;
      }

      if (difficulty) {
        whereClause.difficulty = difficulty;
      }

      if (technology) {
        whereClause.technologies = {
          [Op.contains]: [technology]
        };
      }

      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const allowedSortFields = ['createdAt', 'rating', 'viewsCount', 'completionsCount', 'title'];
      const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const finalSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      const { rows: stacks, count } = await Stack.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: [[finalSortBy, finalSortOrder]],
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage'],
            include: [
              {
                model: UserReputation,
                as: 'reputation',
                attributes: ['totalScore', 'badge']
              }
            ]
          }
        ]
      });

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: {
          stacks,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit),
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1
          }
        }
      });

    } catch (error) {
      console.error('Get stacks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stacks'
      });
    }
  }

  // Get single stack by ID or slug
  async getStackById(req, res) {
    try {
      const { identifier } = req.params;
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      const whereClause = isUUID 
        ? { id: identifier }
        : { slug: identifier };

      const stack = await Stack.findOne({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage'],
            include: [
              {
                model: UserReputation,
                as: 'reputation',
                attributes: ['totalScore', 'badge']
              }
            ]
          }
        ]
      });

      if (!stack) {
        return res.status(404).json({
          success: false,
          message: 'Stack not found'
        });
      }

      // Check if user can view this stack
      if (!stack.isApproved && stack.userId !== req.user?.id && req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
        return res.status(403).json({
          success: false,
          message: 'This stack is pending approval'
        });
      }

      // Increment view count
      await stack.increment('viewsCount');

      res.json({
        success: true,
        data: { stack }
      });

    } catch (error) {
      console.error('Get stack error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stack'
      });
    }
  }

  // Rate a stack
  async rateStack(req, res) {
    try {
      const { stackId } = req.params;
      const { rating } = req.body;
      const userId = req.user.id;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      const stack = await Stack.findByPk(stackId);
      if (!stack) {
        return res.status(404).json({
          success: false,
          message: 'Stack not found'
        });
      }

      // Check if user already rated this stack
      let existingRating = await StackRating.findOne({
        where: { stackId, userId }
      });

      if (existingRating) {
        // Update existing rating
        await existingRating.update({ rating });
      } else {
        // Create new rating
        await StackRating.create({ stackId, userId, rating });
      }

      // Recalculate average rating
      const ratings = await StackRating.findAll({
        where: { stackId },
        attributes: ['rating']
      });
      
      const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      await stack.update({ 
        rating: Math.round(averageRating * 100) / 100,
        ratingCount: ratings.length
      });

      // Add reputation points to stack author if high rating
      if (rating >= 5 && stack.userId !== userId) {
        await reputationService.addPoints(stack.userId, 'STACK_RATED_5');
      }

      res.json({
        success: true,
        message: existingRating ? 'Rating updated successfully' : 'Stack rated successfully',
        data: { 
          rating,
          averageRating: stack.rating 
        }
      });

    } catch (error) {
      console.error('Rate stack error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to rate stack'
      });
    }
  }

  // Like/unlike a stack
  async likeStack(req, res) {
    try {
      const { stackId } = req.params;
      const userId = req.user.id;

      const stack = await Stack.findByPk(stackId);
      if (!stack) {
        return res.status(404).json({
          success: false,
          message: 'Stack not found'
        });
      }

      const existingLike = await StackLike.findOne({
        where: { stackId, userId }
      });

      if (existingLike) {
        // Unlike
        await existingLike.destroy();
        await stack.decrement('likesCount');
        
        res.json({
          success: true,
          message: 'Stack unliked',
          data: { isLiked: false, likesCount: stack.likesCount - 1 }
        });
      } else {
        // Like
        await StackLike.create({ stackId, userId });
        await stack.increment('likesCount');

        res.json({
          success: true,
          message: 'Stack liked',
          data: { isLiked: true, likesCount: stack.likesCount + 1 }
        });
      }

    } catch (error) {
      console.error('Like stack error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to like stack'
      });
    }
  }

  // Approve stack (admin/moderator only)
  async approveStack(req, res) {
    try {
      const { stackId } = req.params;
      const { approved } = req.body;

      const stack = await Stack.findByPk(stackId);
      if (!stack) {
        return res.status(404).json({
          success: false,
          message: 'Stack not found'
        });
      }

      await stack.update({ 
        isApproved: approved === true 
      });

      res.json({
        success: true,
        message: `Stack ${approved ? 'approved' : 'rejected'} successfully`,
        data: { stack }
      });

    } catch (error) {
      console.error('Approve stack error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve stack'
      });
    }
  }

  // Search stacks
  async searchStacks(req, res) {
    try {
      const {
        q: query,
        difficulty,
        technologies = [],
        sortBy = 'relevance',
        page = 1,
        limit = 20
      } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = {
        isPublished: true,
        isApproved: true,
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } }
        ]
      };

      if (difficulty) {
        whereClause.difficulty = difficulty;
      }

      if (technologies.length > 0) {
        whereClause.technologies = {
          [Op.overlap]: Array.isArray(technologies) ? technologies : [technologies]
        };
      }

      // Determine sort order
      let orderClause;
      switch (sortBy) {
        case 'rating':
          orderClause = [['rating', 'DESC']];
          break;
        case 'views':
          orderClause = [['viewsCount', 'DESC']];
          break;
        case 'completions':
          orderClause = [['completionsCount', 'DESC']];
          break;
        case 'newest':
          orderClause = [['createdAt', 'DESC']];
          break;
        default:
          orderClause = [['rating', 'DESC'], ['viewsCount', 'DESC'], ['createdAt', 'DESC']];
      }

      const { rows: stacks, count } = await Stack.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset,
        order: orderClause,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          }
        ]
      });

      const totalPages = Math.ceil(count / parseInt(limit));

      res.json({
        success: true,
        data: {
          stacks,
          query,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Search stacks error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed'
      });
    }
  }

  // Update stack (only by author)
  async updateStack(req, res) {
    try {
      const { stackId } = req.params;
      const updates = req.body;
      
      const stack = await Stack.findByPk(stackId);
      if (!stack) {
        return res.status(404).json({
          success: false,
          message: 'Stack not found'
        });
      }

      if (stack.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own stacks'
        });
      }

      const allowedFields = ['title', 'description', 'content', 'difficulty', 'estimatedTime', 'technologies', 'prerequisites', 'steps', 'resources'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      });

      // If content is updated, require re-approval
      if (updates.content || updates.title) {
        updateData.isApproved = false;
      }

      await stack.update(updateData);

      const updatedStack = await Stack.findByPk(stackId, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          }
        ]
      });

      res.json({
        success: true,
        message: 'Stack updated successfully',
        data: { stack: updatedStack }
      });

    } catch (error) {
      console.error('Update stack error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stack'
      });
    }
  }

  // Delete stack (only by author or admin)
  async deleteStack(req, res) {
    try {
      const { stackId } = req.params;
      
      const stack = await Stack.findByPk(stackId);
      if (!stack) {
        return res.status(404).json({
          success: false,
          message: 'Stack not found'
        });
      }

      if (stack.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own stacks'
        });
      }

      await stack.destroy();

      res.json({
        success: true,
        message: 'Stack deleted successfully'
      });

    } catch (error) {
      console.error('Delete stack error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete stack'
      });
    }
  }

  // Generate URL-friendly slug
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      + '-' + Date.now();
  }
}

module.exports = new StackController();
