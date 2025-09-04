const { UserReputation, User, Bit, Stack } = require('../models');
const { Op } = require('sequelize');

class ReputationService {
  constructor() {
    this.SCORING = {
      BIT_CREATED: 2,
      BIT_LIKED: 1,
      STACK_CREATED: 10,
      STACK_COMPLETED: 5,
      STACK_RATED_5: 3,
      HELPFUL_COMMENT: 1,
      CHAT_PARTICIPATION: 0.5,
      REPORT_CONFIRMED: -5,
      WARNING_RECEIVED: -3
    };

    this.THRESHOLDS = {
      STACK_POSTING: 25,
      CHAT_MODERATION: 100,
      NEWCOMER: 0,
      CONTRIBUTOR: 20,
      EXPERIENCED: 50,
      EXPERT: 150,
      MASTER: 300
    };
  }

  // Calculate and update user reputation
  async calculateUserReputation(userId) {
    try {
      let reputation = await UserReputation.findOne({
        where: { userId }
      });

      if (!reputation) {
        reputation = await UserReputation.create({
          userId,
          totalScore: 0
        });
      }

      // Get user's contributions
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Bit,
            as: 'bits',
            attributes: ['id', 'likesCount', 'createdAt']
          },
          {
            model: Stack,
            as: 'stacks',
            attributes: ['id', 'rating', 'completionsCount', 'createdAt']
          }
        ]
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate scores
      let bitsScore = 0;
      let stacksScore = 0;
      let chatScore = reputation.chatScore || 0;

      // Bits scoring
      if (user.bits) {
        user.bits.forEach(bit => {
          bitsScore += this.SCORING.BIT_CREATED;
          bitsScore += bit.likesCount * this.SCORING.BIT_LIKED;
        });
      }

      // Stacks scoring
      if (user.stacks) {
        user.stacks.forEach(stack => {
          stacksScore += this.SCORING.STACK_CREATED;
          stacksScore += stack.completionsCount * this.SCORING.STACK_COMPLETED;
          if (stack.rating >= 4.5) {
            stacksScore += this.SCORING.STACK_RATED_5;
          }
        });
      }

      const totalScore = bitsScore + stacksScore + chatScore;
      const level = this.calculateLevel(totalScore);
      const badge = this.calculateBadge(totalScore);
      const canPostStacks = totalScore >= this.THRESHOLDS.STACK_POSTING;
      const canModerateChats = totalScore >= this.THRESHOLDS.CHAT_MODERATION;

      // Update reputation
      await reputation.update({
        totalScore,
        bitsScore,
        stacksScore,
        chatScore,
        level,
        badge,
        canPostStacks,
        canModerateChats,
        lastCalculatedAt: new Date()
      });

      return reputation;
    } catch (error) {
      console.error('Reputation calculation error:', error);
      throw error;
    }
  }

  // Add points for specific actions
  async addPoints(userId, action, points = null) {
    try {
      const scoreToAdd = points || this.SCORING[action] || 0;
      
      let reputation = await UserReputation.findOne({
        where: { userId }
      });

      if (!reputation) {
        reputation = await UserReputation.create({
          userId,
          totalScore: scoreToAdd
        });
      } else {
        await reputation.increment('totalScore', { by: scoreToAdd });
        
        // Update chat score if it's a chat action
        if (action === 'CHAT_PARTICIPATION') {
          await reputation.increment('chatScore', { by: scoreToAdd });
        }
      }

      // Recalculate full reputation
      return this.calculateUserReputation(userId);
    } catch (error) {
      console.error('Add points error:', error);
      throw error;
    }
  }

  // Subtract points (for warnings, reports, etc.)
  async subtractPoints(userId, action, points = null) {
    try {
      const scoreToSubtract = Math.abs(points || this.SCORING[action] || 0);
      
      let reputation = await UserReputation.findOne({
        where: { userId }
      });

      if (!reputation) {
        reputation = await UserReputation.create({
          userId,
          totalScore: -scoreToSubtract
        });
      } else {
        await reputation.decrement('totalScore', { by: scoreToSubtract });
      }

      // Add warning if applicable
      if (action === 'WARNING_RECEIVED') {
        await reputation.increment('warningsCount');
      }

      // Recalculate full reputation
      return this.calculateUserReputation(userId);
    } catch (error) {
      console.error('Subtract points error:', error);
      throw error;
    }
  }

  // Calculate user level based on total score
  calculateLevel(totalScore) {
    return Math.floor(totalScore / 20) + 1;
  }

  // Calculate badge based on total score
  calculateBadge(totalScore) {
    if (totalScore >= this.THRESHOLDS.MASTER) return 'master';
    if (totalScore >= this.THRESHOLDS.EXPERT) return 'expert';
    if (totalScore >= this.THRESHOLDS.EXPERIENCED) return 'experienced';
    if (totalScore >= this.THRESHOLDS.CONTRIBUTOR) return 'contributor';
    return 'newcomer';
  }

  // Get user reputation with all details
  async getUserReputation(userId) {
    try {
      const reputation = await UserReputation.findOne({
        where: { userId },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          }
        ]
      });

      if (!reputation) {
        // Create default reputation for new users
        return this.calculateUserReputation(userId);
      }

      return reputation;
    } catch (error) {
      console.error('Get reputation error:', error);
      throw error;
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 50, offset = 0) {
    try {
      return UserReputation.findAndCountAll({
        limit,
        offset,
        order: [['totalScore', 'DESC']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage']
          }
        ]
      });
    } catch (error) {
      console.error('Leaderboard error:', error);
      throw error;
    }
  }

  // Batch recalculate reputation for all users
  async recalculateAllReputations() {
    try {
      const users = await User.findAll({
        attributes: ['id']
      });

      console.log(`Recalculating reputation for ${users.length} users...`);

      const results = [];
      for (const user of users) {
        try {
          const reputation = await this.calculateUserReputation(user.id);
          results.push(reputation);
        } catch (error) {
          console.error(`Error calculating reputation for user ${user.id}:`, error);
        }
      }

      console.log(`Reputation recalculation completed for ${results.length} users`);
      return results;
    } catch (error) {
      console.error('Batch reputation calculation error:', error);
      throw error;
    }
  }
}

module.exports = new ReputationService();
