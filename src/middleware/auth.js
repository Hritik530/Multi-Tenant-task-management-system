const prisma = require('../config/database');
const { verifyAccessToken, isTokenBlacklisted } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/errorHandler');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return unauthorized(res, 'Token has been invalidated');
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return unauthorized(res, 'Invalid or expired token');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return unauthorized(res, 'User not found');
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Require specific role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res);
    }

    if (!roles.includes(req.user.role)) {
      return forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Require admin role
 */
const requireAdmin = requireRole('ADMIN');

/**
 * Require admin or member role
 */
const requireMember = requireRole('ADMIN', 'MEMBER');

module.exports = {
  authenticate,
  requireRole,
  requireAdmin,
  requireMember,
};