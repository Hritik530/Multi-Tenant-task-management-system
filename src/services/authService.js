const prisma = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, blacklistToken } = require('../utils/jwt');

/**
 * Create a new organization with an admin user
 */
const createOrganizationWithAdmin = async (data) => {
  const { name: orgName, user: userData } = data;

  // Create organization and admin user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create organization
    const organization = await tx.organization.create({
      data: { name: orgName },
    });

    // Hash password
    const passwordHash = await hashPassword(userData.password);

    // Create admin user
    const user = await tx.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: 'ADMIN',
        organizationId: organization.id,
      },
    });

    return { organization, user };
  });

  // Generate tokens
  const accessToken = generateAccessToken(result.user);
  const refreshToken = await generateRefreshToken(result.user);

  return {
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      organizationId: result.user.organizationId,
    },
    organization: result.organization,
    accessToken,
    refreshToken,
  };
};

/**
 * Login user
 */
const loginUser = async (data) => {
  const { email, password } = data;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check password
  const isValid = await comparePassword(password, user.passwordHash);
  
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    },
    organization: user.organization,
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (data) => {
  const { refreshToken } = data;

  // Verify refresh token
  const tokenData = await verifyRefreshToken(refreshToken);
  
  if (!tokenData) {
    throw new Error('Invalid or expired refresh token');
  }

  // Generate new access token
  const accessToken = generateAccessToken(tokenData.user);

  return { accessToken };
};

/**
 * Logout user
 */
const logoutUser = async (token) => {
  // Blacklist the current access token
  await blacklistToken(token);

  // Also delete the refresh token if provided
  // (This would be done via the refresh token endpoint)

  return { message: 'Logged out successfully' };
};

/**
 * Get user profile
 */
const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    organization: user.organization,
  };
};

/**
 * Get all users in an organization
 */
const getOrganizationUsers = async (organizationId) => {
  const users = await prisma.user.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return users;
};

/**
 * Invite a new user to the organization (admin only)
 */
const inviteUser = async (data) => {
  const { name, email, password, role, organizationId } = data;

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('Email already in use');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role || 'MEMBER',
      organizationId,
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };
};

/**
 * Remove a user from the organization (admin only)
 */
const removeUser = async (userId, organizationId) => {
  // Check if user exists and belongs to the organization
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      organizationId,
    },
  });

  if (!user) {
    throw new Error('User not found in organization');
  }

  // Don't allow removing yourself
  if (user.id === userId) {
    throw new Error('Cannot remove yourself');
  }

  // Delete user
  await prisma.user.delete({
    where: { id: userId },
  });

  return { message: 'User removed successfully' };
};

module.exports = {
  createOrganizationWithAdmin,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
  getOrganizationUsers,
  inviteUser,
  removeUser,
};