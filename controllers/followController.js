const { Follow, User, UserReputation } = require('../models');
const { Op } = require('sequelize');
const aiRecommendationService = require('../services/aiRecommendationService');

class FollowController {
  constructor() {
    this.followUser = this.followUser.bind(this);
    this.unfollowUser = this.unfollowUser.bind(this);
    this.getFollowers = this.getFollowers.bind(this);
    this.getFollowing = this.getFollowing.bind(this);
    this.getSuggestedUsers = this.getSuggestedUsers.bind(this);
    this.getFollowStats = this.getFollowStats.bind(this);
  }

  // Follow a user
  async followUser(req, res) {
    try {
      const followerId = req.user.id;
      const { userId: followingId } = req.params;

      // Validate input
      if (followerId === followingId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot follow yourself'
        });
      }

      // Check if user exists
      const userToFollow = await User.findByPk(followingId);
      if (!userToFollow) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if already following
      const existingFollow = await Follow.findOne({
        where: { followerId, followingId }
      });

      if (existingFollow) {
        return res.status(400).json({
          success: false,
          message: 'You are already following this user'
        });
      }

      // Create follow relationship
      const follow = await Follow.create({
        followerId,
        followingId
      });

      // Track interaction for AI
      await aiRecommendationService.trackInteraction(
        followerId,
        'user',
        followingId,
        'follow',
        0,
        { action: 'follow_user' }
      );

      // Update user stats (you might want to add follower/following counts to User model)
      await this.updateFollowCounts(followingId, followerId);

      // TODO: Send notification to followed user
      // await notificationService.sendFollowNotification(followingId, followerId);

      res.status(201).json({
        success: true,
        message: `You are now following ${userToFollow.firstName} ${userToFollow.lastName}`,
        data: { follow }
      });

    } catch (error) {
      console.error('Follow user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to follow user'
      });
    }
  }

  // Unfollow a user
  async unfollowUser(req, res) {
    try {
      const followerId = req.user.id;
      const { userId: followingId } = req.params;

      // Find and remove follow relationship
      const follow = await Follow.findOne({
        where: { followerId, followingId }
      });

      if (!follow) {
        return res.status(400).json({
          success: false,
          message: 'You are not following this user'
        });
      }

      await follow.destroy();

      // Update user stats
      await this.updateFollowCounts(followingId, followerId);

      res.json({
        success: true,
        message: 'Unfollowed successfully'
      });

    } catch (error) {
      console.error('Unfollow user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to unfollow user'
      });
    }
  }

  // Get user's followers
  async getFollowers(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { rows: followers, count } = await Follow.findAndCountAll({
        where: { followingId: userId },
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'follower',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'bio'],
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

      // Check if current user follows each follower (for follow-back suggestions)
      const followersWithStatus = await Promise.all(
        followers.map(async (follow) => {
          const isFollowingBack = await Follow.findOne({
            where: {
              followerId: req.user?.id,
              followingId: follow.follower.id
            }
          });

          return {
            ...follow.toJSON(),
            isFollowingBack: !!isFollowingBack
          };
        })
      );

      res.json({
        success: true,
        data: {
          followers: followersWithStatus,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get followers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch followers'
      });
    }
  }

  // Get users that a user is following
  async getFollowing(req, res) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { rows: following, count } = await Follow.findAndCountAll({
        where: { followerId: userId },
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: User,
            as: 'following',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'bio'],
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

      // Check if current user also follows these users
      const followingWithStatus = await Promise.all(
        following.map(async (follow) => {
          const isMutualFollow = req.user?.id && await Follow.findOne({
            where: {
              followerId: req.user.id,
              followingId: follow.following.id
            }
          });

          return {
            ...follow.toJSON(),
            isMutualFollow: !!isMutualFollow
          };
        })
      );

      res.json({
        success: true,
        data: {
          following: followingWithStatus,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / parseInt(limit)),
            totalItems: count,
            itemsPerPage: parseInt(limit)
          }
        }
      });

    } catch (error) {
      console.error('Get following error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch following'
      });
    }
  }

  // Get suggested users to follow
  async getSuggestedUsers(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      // Get users current user is already following
      const alreadyFollowing = await Follow.findAll({
        where: { followerId: userId },
        attributes: ['followingId']
      });
      const followingIds = alreadyFollowing.map(f => f.followingId);

      // Strategy 1: Users with similar interests (based on technologies)
      const userProfile = await aiRecommendationService.buildUserProfile(userId);
      const topTechnologies = userProfile.interests.slice(0, 5).map(i => i.name);

      let suggestions = [];

      if (topTechnologies.length > 0) {
        // Find users who work with similar technologies
        const similarUsers = await User.findAll({
          where: {
            id: {
              [Op.notIn]: [...followingIds, userId]
            },
            interests: {
              [Op.overlap]: topTechnologies
            }
          },
          include: [
            {
              model: UserReputation,
              as: 'reputation',
              attributes: ['totalScore', 'badge']
            }
          ],
          attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'bio', 'interests'],
          limit: parseInt(limit) / 2
        });

        suggestions.push(...similarUsers.map(user => ({
          ...user.toJSON(),
          reason: 'Similar interests in ' + user.interests.filter(i => topTechnologies.includes(i)).slice(0, 2).join(', '),
          suggestionType: 'similar_interests'
        })));
      }

      // Strategy 2: Popular users in the platform
      const popularUsers = await User.findAll({
        where: {
          id: {
            [Op.notIn]: [...followingIds, userId, ...suggestions.map(s => s.id)]
          }
        },
        include: [
          {
            model: UserReputation,
            as: 'reputation',
            where: {
              totalScore: {
                [Op.gte]: 50 // Users with good reputation
              }
            },
            attributes: ['totalScore', 'badge']
          }
        ],
        attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'bio'],
        order: [[{ model: UserReputation, as: 'reputation' }, 'totalScore', 'DESC']],
        limit: parseInt(limit) - suggestions.length
      });

      suggestions.push(...popularUsers.map(user => ({
        ...user.toJSON(),
        reason: `Top contributor with ${user.reputation.totalScore} reputation points`,
        suggestionType: 'popular_user'
      })));

      // Strategy 3: Friends of friends (mutual connections)
      if (suggestions.length < parseInt(limit)) {
        const mutualConnections = await this.findMutualConnections(userId, followingIds);
        suggestions.push(...mutualConnections.slice(0, parseInt(limit) - suggestions.length));
      }

      res.json({
        success: true,
        data: {
          suggestions: suggestions.slice(0, parseInt(limit)),
          meta: {
            strategies: ['similar_interests', 'popular_users', 'mutual_connections'],
            userInterests: topTechnologies
          }
        }
      });

    } catch (error) {
      console.error('Get suggested users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user suggestions'
      });
    }
  }

  // Get follow statistics for a user
  async getFollowStats(req, res) {
    try {
      const { userId } = req.params;

      const [followersCount, followingCount] = await Promise.all([
        Follow.count({ where: { followingId: userId } }),
        Follow.count({ where: { followerId: userId } })
      ]);

      // Get mutual follows if viewing another user's profile
      let mutualFollowsCount = 0;
      if (req.user && req.user.id !== userId) {
        // Find users that both current user and target user follow
        const currentUserFollowing = await Follow.findAll({
          where: { followerId: req.user.id },
          attributes: ['followingId']
        });
        const currentFollowingIds = currentUserFollowing.map(f => f.followingId);

        if (currentFollowingIds.length > 0) {
          mutualFollowsCount = await Follow.count({
            where: {
              followerId: userId,
              followingId: {
                [Op.in]: currentFollowingIds
              }
            }
          });
        }
      }

      res.json({
        success: true,
        data: {
          followersCount,
          followingCount,
          mutualFollowsCount,
          ratios: {
            followingToFollowersRatio: followersCount > 0 ? 
              Math.round((followingCount / followersCount) * 100) / 100 : 0
          }
        }
      });

    } catch (error) {
      console.error('Get follow stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get follow statistics'
      });
    }
  }

  // Helper: Find mutual connections
  async findMutualConnections(userId, followingIds) {
    try {
      if (followingIds.length === 0) return [];

      // Find users who are followed by users that current user follows
      const mutualConnections = await Follow.findAll({
        where: {
          followerId: {
            [Op.in]: followingIds
          },
          followingId: {
            [Op.notIn]: [...followingIds, userId]
          }
        },
        include: [
          {
            model: User,
            as: 'following',
            attributes: ['id', 'username', 'firstName', 'lastName', 'profileImage', 'bio'],
            include: [
              {
                model: UserReputation,
                as: 'reputation',
                attributes: ['totalScore', 'badge']
              }
            ]
          },
          {
            model: User,
            as: 'follower',
            attributes: ['firstName', 'lastName', 'username']
          }
        ],
        limit: 5
      });

      return mutualConnections.map(connection => ({
        ...connection.following.toJSON(),
        reason: `Followed by ${connection.follower.firstName} ${connection.follower.lastName}`,
        suggestionType: 'mutual_connection'
      }));

    } catch (error) {
      console.error('Find mutual connections error:', error);
      return [];
    }
  }

  // Helper: Update follow counts (if you add these fields to User model)
  async updateFollowCounts(followingId, followerId) {
    try {
      // You can implement this if you add followersCount and followingCount to User model
      // This improves performance by avoiding COUNT queries each time
      
      const [followersCount, followingCount] = await Promise.all([
        Follow.count({ where: { followingId } }),
        Follow.count({ where: { followerId } })
      ]);

      // Update both users' counts
      // await Promise.all([
      //   User.update({ followersCount }, { where: { id: followingId } }),
      //   User.update({ followingCount }, { where: { id: followerId } })
      // ]);

    } catch (error) {
      console.error('Update follow counts error:', error);
    }
  }
}

module.exports = new FollowController();
