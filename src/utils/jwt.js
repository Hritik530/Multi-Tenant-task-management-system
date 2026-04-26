const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Generate access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = async (user) => {
  const token = require('uuid').v4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });

  return token;
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = async (token) => {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!refreshToken) {
    return null;
  }

  if (new Date() > refreshToken.expiresAt) {
    // Token expired, delete it
    await prisma.refreshToken.delete({ where: { id: refreshToken.id } });
    return null;
  }

  return refreshToken;
};

/**
 * Check if token is blacklisted
 */
const isTokenBlacklisted = async (token) => {
  const blacklisted = await prisma.blacklistedToken.findUnique({
    where: { token },
  });
  return !!blacklisted;
};

/**
 * Blacklist a token (for logout)
 */
const blacklistToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const expiresAt = new Date(decoded.exp * 1000);
      await prisma.blacklistedToken.create({
        data: {
          token,
          expiresAt,
        },
      });
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
  }
};

/**
 * Clean up expired blacklisted tokens
 */
const cleanupExpiredTokens = async () => {
  const now = new Date();
  await prisma.blacklistedToken.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isTokenBlacklisted,
  blacklistToken,
  cleanupExpiredTokens,
};