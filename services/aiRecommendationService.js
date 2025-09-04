const { User, Bit, Stack, UserInteraction, UserReputation } = require('../models');
const { Op } = require('sequelize');

class AIRecommendationService {
  constructor() {
    this.INTERACTION_WEIGHTS = {
      view: 1,
      like: 3,
      comment: 4,
      share: 5,
      bookmark: 4,
      follow: 6,
      join: 5,
      complete: 8
    };

    this.DECAY_FACTOR = 0.95; // Content gets less relevant over time
    this.MIN_INTERACTIONS = 5; // Minimum interactions before personalizing
  }

  // Track user interaction
  async trackInteraction(userId, contentType, contentId, interactionType, duration = 0, metadata = {}) {
    try {
      const score = this.INTERACTION_WEIGHTS[interactionType] || 1;
      
      // Check if interaction already exists (for views, update duration)
      if (interactionType === 'view') {
        const existing = await UserInteraction.findOne({
          where: { userId, contentType, contentId, interactionType }
        });

        if (existing) {
          await existing.update({
            duration: existing.duration + duration,
            metadata: { ...existing.metadata, ...metadata },
            updatedAt: new Date()
          });
          return existing;
        }
      }

      // Create new interaction
      const interaction = await UserInteraction.create({
        userId,
        contentType,
        contentId,
        interactionType,
        duration,
        metadata,
        score
      });

      return interaction;
    } catch (error) {
      console.error('Track interaction error:', error);
      throw error;
    }
  }

  // Get personalized feed for user
  async getPersonalizedFeed(userId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const user = await User.findByPk(userId, {
        include: [{
          model: UserReputation,
          as: 'reputation'
        }]
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has enough interaction history
      const interactionCount = await UserInteraction.count({
        where: { userId }
      });

      if (interactionCount < this.MIN_INTERACTIONS) {
        // Return trending content for new users
        return this.getTrendingFeed(limit, offset);
      }

      // Get user's interaction patterns
      const userProfile = await this.buildUserProfile(userId);
      
      // Get content-based recommendations
      const contentRecommendations = await this.getContentBasedRecommendations(userId, userProfile, limit, offset);
      
      // Get collaborative filtering recommendations
      const collaborativeRecommendations = await this.getCollaborativeRecommendations(userId, limit / 2);

      // Combine and rank recommendations
      const combinedFeed = this.combineRecommendations(
        contentRecommendations,
        collaborativeRecommendations,
        userProfile
      );

      return {
        success: true,
        data: combinedFeed,
        algorithm: 'hybrid',
        userProfile: {
          interactionCount,
          topInterests: userProfile.interests.slice(0, 5),
          preferredTypes: userProfile.preferredTypes
        }
      };

    } catch (error) {
      console.error('Get personalized feed error:', error);
      // Fallback to trending feed
      return this.getTrendingFeed(limit, offset);
    }
  }

  // Build user interest profile from interactions
  async buildUserProfile(userId) {
    try {
      const interactions = await UserInteraction.findAll({
        where: {
          userId,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        include: [{
          model: User,
          as: 'user'
        }]
      });

      const profile = {
        interests: {},
        preferredTypes: {},
        technologies: {},
        timePreferences: {},
        totalScore: 0
      };

      for (const interaction of interactions) {
        const weight = this.INTERACTION_WEIGHTS[interaction.interactionType] || 1;
        const timeDecay = Math.pow(this.DECAY_FACTOR, 
          Math.floor((Date.now() - interaction.createdAt.getTime()) / (24 * 60 * 60 * 1000))
        );
        const score = weight * timeDecay;

        profile.totalScore += score;

        // Track content type preferences
        profile.preferredTypes[interaction.contentType] = 
          (profile.preferredTypes[interaction.contentType] || 0) + score;

        // Extract interests from content
        if (interaction.contentType === 'bit' || interaction.contentType === 'stack') {
          const content = await this.getContentById(interaction.contentType, interaction.contentId);
          if (content && content.technologies) {
            content.technologies.forEach(tech => {
              profile.technologies[tech] = (profile.technologies[tech] || 0) + score;
            });
          }
        }

        // Track time preferences
        const hour = interaction.createdAt.getHours();
        profile.timePreferences[hour] = (profile.timePreferences[hour] || 0) + score;
      }

      // Normalize and sort
      profile.interests = Object.entries(profile.technologies)
        .sort(([,a], [,b]) => b - a)
        .map(([tech, score]) => ({ name: tech, score: score / profile.totalScore }));

      return profile;
    } catch (error) {
      console.error('Build user profile error:', error);
      return { interests: [], preferredTypes: {}, technologies: {}, timePreferences: {} };
    }
  }

  // Content-based recommendations
  async getContentBasedRecommendations(userId, userProfile, limit, offset) {
    try {
      const topTechnologies = userProfile.interests.slice(0, 10).map(i => i.name);
      
      // Get Bits matching user interests
      const bits = await Bit.findAll({
        where: {
          isPublic: true,
          isFlagged: false,
          technologies: {
            [Op.overlap]: topTechnologies
          },
          userId: {
            [Op.ne]: userId // Exclude user's own content
          }
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
        }],
        order: [
          ['likesCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: Math.ceil(limit * 0.6)
      });

      // Get Stacks matching user interests
      const stacks = await Stack.findAll({
        where: {
          isPublished: true,
          isApproved: true,
          technologies: {
            [Op.overlap]: topTechnologies
          },
          userId: {
            [Op.ne]: userId
          }
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
        }],
        order: [
          ['rating', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: Math.ceil(limit * 0.4)
      });

      // Combine and add recommendation scores
      const recommendations = [
        ...bits.map(bit => ({
          ...bit.toJSON(),
          type: 'bit',
          recommendationScore: this.calculateContentScore(bit, userProfile),
          reason: 'Based on your interests in ' + bit.technologies.filter(t => topTechnologies.includes(t)).join(', ')
        })),
        ...stacks.map(stack => ({
          ...stack.toJSON(),
          type: 'stack',
          recommendationScore: this.calculateContentScore(stack, userProfile),
          reason: 'Tutorial matching your interests in ' + stack.technologies.filter(t => topTechnologies.includes(t)).join(', ')
        }))
      ];

      return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
    } catch (error) {
      console.error('Content-based recommendations error:', error);
      return [];
    }
  }

  // Collaborative filtering recommendations
  async getCollaborativeRecommendations(userId, limit) {
    try {
      // Find users with similar interaction patterns
      const similarUsers = await this.findSimilarUsers(userId);
      
      if (similarUsers.length === 0) {
        return [];
      }

      const recommendations = [];
      
      for (const similarUser of similarUsers.slice(0, 5)) {
        // Get content that similar users liked but current user hasn't seen
        const theirLikes = await UserInteraction.findAll({
          where: {
            userId: similarUser.id,
            interactionType: ['like', 'bookmark', 'complete']
          },
          limit: 10,
          order: [['createdAt', 'DESC']]
        });

        for (const like of theirLikes) {
          // Check if current user has already interacted with this content
          const userInteraction = await UserInteraction.findOne({
            where: {
              userId,
              contentType: like.contentType,
              contentId: like.contentId
            }
          });

          if (!userInteraction) {
            const content = await this.getContentById(like.contentType, like.contentId);
            if (content) {
              recommendations.push({
                ...content.toJSON(),
                type: like.contentType,
                recommendationScore: similarUser.similarity * this.INTERACTION_WEIGHTS[like.interactionType],
                reason: `Users with similar interests also liked this`
              });
            }
          }
        }
      }

      return recommendations
        .sort((a, b) => b.recommendationScore - a.recommendationScore)
        .slice(0, limit);
        
    } catch (error) {
      console.error('Collaborative recommendations error:', error);
      return [];
    }
  }

  // Find users with similar interaction patterns
  async findSimilarUsers(userId) {
    try {
      const userInteractions = await UserInteraction.findAll({
        where: { userId },
        attributes: ['contentType', 'contentId', 'interactionType', 'score']
      });

      if (userInteractions.length === 0) {
        return [];
      }

      // Get other users who interacted with same content
      const contentIds = userInteractions.map(i => i.contentId);
      
      const otherUserInteractions = await UserInteraction.findAll({
        where: {
          userId: { [Op.ne]: userId },
          contentId: { [Op.in]: contentIds }
        },
        attributes: ['userId', 'contentId', 'interactionType', 'score'],
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username']
        }]
      });

      // Calculate similarity scores
      const userScores = {};
      
      otherUserInteractions.forEach(interaction => {
        if (!userScores[interaction.userId]) {
          userScores[interaction.userId] = {
            id: interaction.userId,
            similarity: 0,
            commonInteractions: 0
          };
        }

        const userInteraction = userInteractions.find(
          ui => ui.contentId === interaction.contentId
        );

        if (userInteraction) {
          userScores[interaction.userId].similarity += 
            Math.min(userInteraction.score, interaction.score);
          userScores[interaction.userId].commonInteractions += 1;
        }
      });

      // Normalize similarity scores and filter out users with too few common interactions
      return Object.values(userScores)
        .filter(user => user.commonInteractions >= 3)
        .map(user => ({
          ...user,
          similarity: user.similarity / Math.max(user.commonInteractions, 1)
        }))
        .sort((a, b) => b.similarity - a.similarity);
        
    } catch (error) {
      console.error('Find similar users error:', error);
      return [];
    }
  }

  // Calculate content relevance score for user
  calculateContentScore(content, userProfile) {
    let score = 0;

    // Technology match score
    if (content.technologies) {
      content.technologies.forEach(tech => {
        const interest = userProfile.interests.find(i => i.name === tech);
        if (interest) {
          score += interest.score * 10;
        }
      });
    }

    // Engagement score (likes, views, etc.)
    score += (content.likesCount || 0) * 0.1;
    score += (content.viewsCount || 0) * 0.05;

    // Recency bonus (newer content gets slight boost)
    const ageInDays = (Date.now() - content.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    score += Math.max(0, 1 - ageInDays / 30); // Decays over 30 days

    return Math.round(score * 100) / 100;
  }

  // Combine different recommendation approaches
  combineRecommendations(contentBased, collaborative, userProfile) {
    const combined = [...contentBased, ...collaborative];
    
    // Remove duplicates
    const seen = new Set();
    const unique = combined.filter(item => {
      const key = `${item.type}-${item.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Sort by recommendation score
    return unique
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 20);
  }

  // Fallback trending feed for new users
  async getTrendingFeed(limit, offset) {
    try {
      const bits = await Bit.findAll({
        where: {
          isPublic: true,
          isFlagged: false,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
          }
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
        }],
        order: [
          ['likesCount', 'DESC'],
          ['viewsCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: Math.ceil(limit * 0.7),
        offset
      });

      const stacks = await Stack.findAll({
        where: {
          isPublished: true,
          isApproved: true,
          createdAt: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
        }],
        order: [
          ['rating', 'DESC'],
          ['likesCount', 'DESC'],
          ['createdAt', 'DESC']
        ],
        limit: Math.ceil(limit * 0.3),
        offset: Math.floor(offset * 0.3)
      });

      const trending = [
        ...bits.map(bit => ({ ...bit.toJSON(), type: 'bit', reason: 'Trending this week' })),
        ...stacks.map(stack => ({ ...stack.toJSON(), type: 'stack', reason: 'Popular tutorial' }))
      ];

      return {
        success: true,
        data: trending,
        algorithm: 'trending',
        userProfile: null
      };

    } catch (error) {
      console.error('Get trending feed error:', error);
      return { success: false, data: [], algorithm: 'error' };
    }
  }

  // Helper to get content by type and ID
  async getContentById(type, id) {
    try {
      if (type === 'bit') {
        return await Bit.findByPk(id, {
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          }]
        });
      } else if (type === 'stack') {
        return await Stack.findByPk(id, {
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          }]
        });
      }
      return null;
    } catch (error) {
      console.error('Get content by ID error:', error);
      return null;
    }
  }
}

module.exports = new AIRecommendationService();
