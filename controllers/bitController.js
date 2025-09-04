const { Bit, User, BitLike, BitComment, UserReputation } = require('../models');
const { Op } = require('sequelize');
const reputationService = require('../services/reputationService');

class BitController {
  constructor() {
    this.createBit = this.createBit.bind(this);
    this.getBits = this.getBits.bind(this);
    this.getBitById = this.getBitById.bind(this);
    this.updateBit = this.updateBit.bind(this);
    this.deleteBit = this.deleteBit.bind(this);
    this.likeBit = this.likeBit.bind(this);
    this.searchBits = this.searchBits.bind(this);
  }

  // Create a new Bit
  async createBit(req, res) {
    try {
      const {
        title,
        content,
        type,
        technologies,
        tags,
        isPublic
      } = req.body;

      // Generate slug
      const slug = this.generateSlug(title);

      // Create bit
      const bit = await Bit.create({
        title,
        content,
        type: type || 'text',
        technologies: technologies || [],
        tags: tags || [],
        isPublic: isPublic !== false,
        userId: req.user.id,
        slug
      });

      // Add reputation points
      await reputationService.addPoints(req.user.id, 'BIT_CREATED');

      // Fetch bit with author info
      const createdBit = await Bit.findByPk(bit.id, {
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
        message: 'Bit created successfully',
        data: { bit: createdBit }
      });

    } catch (error) {
      console.error('Create bit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create bit'
      });
    }
  }

  // Get paginated bits with filtering
  async getBits(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        technology,
        tag,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = { isPublic: true, isFlagged: false };

      if (type) {
        whereClause.type = type;
      }

      if (technology) {
        whereClause.technologies = {
          [Op.contains]: [technology]
        };
      }

      if (tag) {
        whereClause.tags = {
          [Op.contains]: [tag]
        };
      }

      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const allowedSortFields = ['createdAt', 'likesCount', 'viewsCount', 'title'];
      const finalSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const finalSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      const { rows: bits, count } = await Bit.findAndCountAll({
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
          bits,
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
      console.error('Get bits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bits'
      });
    }
  }

  // Get single bit by ID or slug
  async getBitById(req, res) {
    try {
      const { identifier } = req.params;
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      const whereClause = isUUID 
        ? { id: identifier }
        : { slug: identifier };

      const bit = await Bit.findOne({
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

      if (!bit) {
        return res.status(404).json({
          success: false,
          message: 'Bit not found'
        });
      }

      // Check if user can view this bit
      if (!bit.isPublic && bit.userId !== req.user?.id) {
        return res.status(403).json({
          success: false,
          message: 'This bit is private'
        });
      }

      // Increment view count
      await bit.increment('viewsCount');

      res.json({
        success: true,
        data: { bit }
      });

    } catch (error) {
      console.error('Get bit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch bit'
      });
    }
  }

  // Like/unlike a bit
  async likeBit(req, res) {
    try {
      const { bitId } = req.params;
      const userId = req.user.id;

      const bit = await Bit.findByPk(bitId);
      if (!bit) {
        return res.status(404).json({
          success: false,
          message: 'Bit not found'
        });
      }

      // Check if already liked
      const existingLike = await BitLike.findOne({
        where: { bitId, userId }
      });

      if (existingLike) {
        // Unlike
        await existingLike.destroy();
        await bit.decrement('likesCount');
        
        res.json({
          success: true,
          message: 'Bit unliked',
          data: { isLiked: false, likesCount: bit.likesCount - 1 }
        });
      } else {
        // Like
        await BitLike.create({ bitId, userId });
        await bit.increment('likesCount');
        
        // Add reputation points to bit author
        if (bit.userId !== userId) {
          await reputationService.addPoints(bit.userId, 'BIT_LIKED');
        }

        res.json({
          success: true,
          message: 'Bit liked',
          data: { isLiked: true, likesCount: bit.likesCount + 1 }
        });
      }

    } catch (error) {
      console.error('Like bit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to like bit'
      });
    }
  }

  // Search bits with advanced filtering
  async searchBits(req, res) {
    try {
      const {
        q: query,
        technologies = [],
        tags = [],
        type,
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
        isPublic: true,
        isFlagged: false,
        [Op.or]: [
          { title: { [Op.iLike]: `%${query}%` } },
          { content: { [Op.iLike]: `%${query}%` } }
        ]
      };

      // Add filters
      if (type) {
        whereClause.type = type;
      }

      if (technologies.length > 0) {
        whereClause.technologies = {
          [Op.overlap]: Array.isArray(technologies) ? technologies : [technologies]
        };
      }

      if (tags.length > 0) {
        whereClause.tags = {
          [Op.overlap]: Array.isArray(tags) ? tags : [tags]
        };
      }

      // Determine sort order
      let orderClause;
      switch (sortBy) {
        case 'likes':
          orderClause = [['likesCount', 'DESC']];
          break;
        case 'views':
          orderClause = [['viewsCount', 'DESC']];
          break;
        case 'newest':
          orderClause = [['createdAt', 'DESC']];
          break;
        case 'oldest':
          orderClause = [['createdAt', 'ASC']];
          break;
        default: // relevance
          orderClause = [['likesCount', 'DESC'], ['viewsCount', 'DESC'], ['createdAt', 'DESC']];
      }

      const { rows: bits, count } = await Bit.findAndCountAll({
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
          bits,
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
      console.error('Search bits error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed'
      });
    }
  }

  // Update bit (only by author)
  async updateBit(req, res) {
    try {
      const { bitId } = req.params;
      const updates = req.body;
      
      const bit = await Bit.findByPk(bitId);
      if (!bit) {
        return res.status(404).json({
          success: false,
          message: 'Bit not found'
        });
      }

      // Check ownership
      if (bit.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own bits'
        });
      }

      // Update allowed fields
      const allowedFields = ['title', 'content', 'technologies', 'tags', 'isPublic'];
      const updateData = {};
      
      allowedFields.forEach(field => {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      });

      await bit.update(updateData);

      const updatedBit = await Bit.findByPk(bitId, {
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
        message: 'Bit updated successfully',
        data: { bit: updatedBit }
      });

    } catch (error) {
      console.error('Update bit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update bit'
      });
    }
  }

  // Delete bit (only by author or admin)
  async deleteBit(req, res) {
    try {
      const { bitId } = req.params;
      
      const bit = await Bit.findByPk(bitId);
      if (!bit) {
        return res.status(404).json({
          success: false,
          message: 'Bit not found'
        });
      }

      // Check ownership or admin role
      if (bit.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own bits'
        });
      }

      await bit.destroy();

      res.json({
        success: true,
        message: 'Bit deleted successfully'
      });

    } catch (error) {
      console.error('Delete bit error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete bit'
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

module.exports = new BitController();
