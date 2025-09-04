const aiRecommendationService = require('../services/aiRecommendationService');

class AIController {
  // Get personalized feed
  async getPersonalizedFeed(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const feed = await aiRecommendationService.getPersonalizedFeed(
        userId,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        success: true,
        data: feed.data,
        meta: {
          algorithm: feed.algorithm,
          userProfile: feed.userProfile,
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Get personalized feed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get personalized feed'
      });
    }
  }

  // Track user interaction
  async trackInteraction(req, res) {
    try {
      const userId = req.user.id;
      const {
        contentType,
        contentId,
        interactionType,
        duration = 0,
        metadata = {}
      } = req.body;

      const interaction = await aiRecommendationService.trackInteraction(
        userId,
        contentType,
        contentId,
        interactionType,
        duration,
        metadata
      );

      res.json({
        success: true,
        data: { interaction }
      });

    } catch (error) {
      console.error('Track interaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track interaction'
      });
    }
  }

  // Get user's interaction analytics
  async getUserAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const userProfile = await aiRecommendationService.buildUserProfile(userId);

      res.json({
        success: true,
        data: {
          profile: userProfile,
          insights: {
            topInterests: userProfile.interests.slice(0, 10),
            preferredContentTypes: userProfile.preferredTypes,
            mostActiveHours: Object.entries(userProfile.timePreferences)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([hour, score]) => ({ hour: parseInt(hour), score }))
          }
        }
      });

    } catch (error) {
      console.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user analytics'
      });
    }
  }
}

module.exports = new AIController();
