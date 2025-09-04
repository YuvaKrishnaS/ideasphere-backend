const { Interest, UserInterest, User } = require('../models');
const { Op } = require('sequelize');

class InterestController {
  // Get all active interests with categories
  async getAll(req, res) {
    try {
      const { category } = req.query;
      
      const whereClause = { isActive: true };
      if (category) {
        whereClause.category = category;
      }

      const interests = await Interest.findAll({
        where: whereClause,
        order: [['category', 'ASC'], ['name', 'ASC']],
        attributes: ['id', 'name', 'slug', 'description', 'category', 'color']
      });

      // Group by category for better organization
      const groupedInterests = interests.reduce((acc, interest) => {
        const category = interest.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(interest);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          interests,
          categories: groupedInterests
        }
      });

    } catch (error) {
      console.error('Get interests error:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to fetch interests'
      });
    }
  }

  // Add/Update user interests
  async updateUserInterests(req, res) {
    try {
      const { interests } = req.body; // [{ interestId, proficiencyLevel, isPrimary }]
      
      if (!interests || !Array.isArray(interests)) {
        return res.status(400).json({
          success: false,
          message: 'Interests array is required'
        });
      }

      if (interests.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one interest must be selected'
        });
      }

      if (interests.length > 10) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 10 interests allowed'
        });
      }

      const user = req.user;

      // Validate all interest IDs exist
      const interestIds = interests.map(i => i.interestId);
      const validInterests = await Interest.findAll({
        where: { 
          id: { [Op.in]: interestIds },
          isActive: true 
        }
      });

      if (validInterests.length !== interestIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more invalid interest IDs provided'
        });
      }

      // Ensure only one primary interest
      const primaryInterests = interests.filter(i => i.isPrimary);
      if (primaryInterests.length > 1) {
        return res.status(400).json({
          success: false,
          message: 'Only one primary interest allowed'
        });
      }

      // Delete existing user interests
      await UserInterest.destroy({ 
        where: { userId: user.id } 
      });

      // Create new user interests
      const userInterestsData = interests.map(interest => ({
        userId: user.id,
        interestId: interest.interestId,
        proficiencyLevel: interest.proficiencyLevel || 'beginner',
        isPrimary: Boolean(interest.isPrimary)
      }));

      await UserInterest.bulkCreate(userInterestsData, {
        validate: true
      });

      // Get updated interests with details
      const updatedInterests = await user.getInterests({
        through: { 
          attributes: ['proficiencyLevel', 'isPrimary'] 
        }
      });

      res.json({
        success: true,
        message: 'Interests updated successfully',
        data: { interests: updatedInterests }
      });

    } catch (error) {
      console.error('Update user interests error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user interests'
      });
    }
  }

  // Get user's interests
  async getUserInterests(req, res) {
    try {
      const { userId } = req.params;
      const requestedUserId = userId || req.user.id;

      const user = await User.findByPk(requestedUserId, {
        include: [{
          model: Interest,
          as: 'interests',
          through: { 
            attributes: ['proficiencyLevel', 'isPrimary'],
            as: 'userInterest'
          }
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: { 
          interests: user.interests,
          totalCount: user.interests.length
        }
      });

    } catch (error) {
      console.error('Get user interests error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user interests'
      });
    }
  }

  // Get interest statistics
  async getInterestStats(req, res) {
    try {
      const stats = await Interest.findAll({
        where: { isActive: true },
        attributes: [
          'id', 
          'name', 
          'category',
          [sequelize.fn('COUNT', sequelize.col('users.id')), 'userCount']
        ],
        include: [{
          model: User,
          as: 'users',
          attributes: [],
          through: { attributes: [] }
        }],
        group: ['Interest.id'],
        order: [[sequelize.fn('COUNT', sequelize.col('users.id')), 'DESC']]
      });

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('Get interest stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching interest statistics'
      });
    }
  }
}

module.exports = new InterestController();
