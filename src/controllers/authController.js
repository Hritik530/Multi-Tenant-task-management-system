const authService = require('../services/authService');
const { successResponse, badRequest, internalError } = require('../utils/errorHandler');
const { validate, validateParams, registerSchema, loginSchema, refreshTokenSchema } = require('../utils/validation');

/**
 * Register a new user and organization
 */
const register = async (req, res, next) => {
  try {
    // Validate request
    const { error, value } = validate(registerSchema, req.body);
    if (error) {
      return badRequest(res, error.details[0].message);
    }

    // Create organization and admin user
    const result = await authService.createOrganizationWithAdmin({
      name: value.organizationName,
      user: {
        name: value.name,
        email: value.email,
        password: value.password,
      },
    });

    return successResponse(res, 201, {
      user: result.user,
      organization: result.organization,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Registration successful');
  } catch (error) {
    console.error('Register error:', error);
    
    if (error.message === 'Email already in use') {
      return badRequest(res, 'Email already in use');
    }
    
    return internalError(res);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    // Validate request
    const { error, value } = validate(loginSchema, req.body);
    if (error) {
      return badRequest(res, error.details[0].message);
    }

    // Login user
    const result = await authService.loginUser({
      email: value.email,
      password: value.password,
    });

    return successResponse(res, 200, {
      user: result.user,
      organization: result.organization,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    
    if (error.message === 'Invalid credentials') {
      return badRequest(res, 'Invalid email or password');
    }
    
    return internalError(res);
  }
};

/**
 * Refresh access token
 */
const refresh = async (req, res, next) => {
  try {
    // Validate request
    const { error, value } = validate(refreshTokenSchema, req.body);
    if (error) {
      return badRequest(res, error.details[0].message);
    }

    // Refresh token
    const result = await authService.refreshAccessToken({
      refreshToken: value.refreshToken,
    });

    return successResponse(res, 200, result, 'Token refreshed');
  } catch (error) {
    console.error('Refresh error:', error);
    
    if (error.message === 'Invalid or expired refresh token') {
      return badRequest(res, 'Invalid or expired refresh token');
    }
    
    return internalError(res);
  }
};

/**
 * Logout user
 */
const logout = async (req, res, next) => {
  try {
    // Blacklist the current token
    await authService.logoutUser(req.token);

    return successResponse(res, 200, null, 'Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    return internalError(res);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user.id);
    return successResponse(res, 200, user);
  } catch (error) {
    console.error('Get profile error:', error);
    return internalError(res);
  }
};

/**
 * Get all users in organization (admin only)
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await authService.getOrganizationUsers(req.organizationId);
    return successResponse(res, 200, users);
  } catch (error) {
    console.error('Get users error:', error);
    return internalError(res);
  }
};

/**
 * Invite a new user to the organization (admin only)
 */
const inviteUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return badRequest(res, 'Name, email, and password are required');
    }

    const user = await authService.inviteUser({
      name,
      email,
      password,
      role,
      organizationId: req.organizationId,
    });

    return successResponse(res, 201, user, 'User invited successfully');
  } catch (error) {
    console.error('Invite user error:', error);
    
    if (error.message === 'Email already in use') {
      return badRequest(res, 'Email already in use');
    }
    
    return internalError(res);
  }
};

/**
 * Remove a user from the organization (admin only)
 */
const removeUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    await authService.removeUser(id, req.organizationId);

    return successResponse(res, 200, null, 'User removed successfully');
  } catch (error) {
    console.error('Remove user error:', error);
    
    if (error.message === 'User not found in organization') {
      return badRequest(res, 'User not found in organization');
    }
    
    if (error.message === 'Cannot remove yourself') {
      return badRequest(res, 'Cannot remove yourself');
    }
    
    return internalError(res);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getProfile,
  getUsers,
  inviteUser,
  removeUser,
};