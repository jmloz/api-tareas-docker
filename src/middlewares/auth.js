const { verificarToken } = require('../utils/jwt');
const { User } = require('../models');
const logger = require('../config/logger');

const protectRoute = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token not provided. Include token in Authorization header: Bearer <token>'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = verificarToken(token);

    // Find user in database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or invalid token'
      });
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
};

// Optional middleware to verify roles
const verifyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (req.user.role && allowedRoles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource'
      });
    }
  };
};

module.exports = { protectRoute, verifyRole };