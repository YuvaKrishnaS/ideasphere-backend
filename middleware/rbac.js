const { UserReputation } = require('../models');

// Define roles and permissions
const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator', 
  USER: 'user'
};

const PERMISSIONS = {
  CREATE_BIT: 'create_bit',
  CREATE_STACK: 'create_stack',
  MODERATE_CHAT: 'moderate_chat',
  DELETE_CONTENT: 'delete_content',
  BAN_USER: 'ban_user',
  VIEW_REPORTS: 'view_reports',
  RESOLVE_REPORTS: 'resolve_reports'
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.CREATE_BIT,
    PERMISSIONS.CREATE_STACK,
    PERMISSIONS.MODERATE_CHAT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.BAN_USER,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.RESOLVE_REPORTS
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.CREATE_BIT,
    PERMISSIONS.CREATE_STACK,
    PERMISSIONS.MODERATE_CHAT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.RESOLVE_REPORTS
  ],
  [ROLES.USER]: [
    PERMISSIONS.CREATE_BIT
  ]
};

// Middleware to check if user has required role
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = user.role || ROLES.USER;
    const hasRole = allowedRoles.includes(userRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware to check if user has required permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = user.role || ROLES.USER;
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    const hasPermission = rolePermissions.includes(permission);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Permission '${permission}' required`
      });
    }

    next();
  };
};

// Middleware to check reputation requirements
const requireReputation = (minScore) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const reputation = await UserReputation.findOne({
        where: { userId: user.id }
      });

      const currentScore = reputation ? reputation.totalScore : 0;

      if (currentScore < minScore) {
        return res.status(403).json({
          success: false,
          message: `Minimum reputation of ${minScore} required. Current: ${currentScore}`
        });
      }

      req.userReputation = reputation;
      next();
    } catch (error) {
      console.error('Reputation check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking user reputation'
      });
    }
  };
};

// Middleware to check if user can post stacks
const canPostStacks = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin and moderator can always post stacks
    if (user.role === ROLES.ADMIN || user.role === ROLES.MODERATOR) {
      return next();
    }

    const reputation = await UserReputation.findOne({
      where: { userId: user.id }
    });

    if (!reputation || !reputation.canPostStacks) {
      return res.status(403).json({
        success: false,
        message: 'You need to meet certain criteria to post tutorials (Stacks). Keep contributing with Bits to unlock this feature!'
      });
    }

    next();
  } catch (error) {
    console.error('Stack posting permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking posting permissions'
    });
  }
};

// Middleware to check if user can participate in chat
const canChat = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email to participate in chat'
      });
    }

    // Check reputation threshold for chat (minimum 5 points)
    const reputation = await UserReputation.findOne({
      where: { userId: user.id }
    });

    const currentScore = reputation ? reputation.totalScore : 0;
    
    if (currentScore < 5) {
      return res.status(403).json({
        success: false,
        message: 'Minimum reputation of 5 required to participate in chat. Current: ' + currentScore
      });
    }

    // Check if user has too many warnings
    if (reputation && reputation.warningsCount >= 3) {
      return res.status(403).json({
        success: false,
        message: 'Chat access suspended due to multiple warnings'
      });
    }

    next();
  } catch (error) {
    console.error('Chat permission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking chat permissions'
    });
  }
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  requireRole,
  requirePermission,
  requireReputation,
  canPostStacks,
  canChat
};
