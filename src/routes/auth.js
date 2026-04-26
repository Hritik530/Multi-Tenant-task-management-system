const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { tenantIsolation } = require('../middleware/tenant');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Protected routes - require authentication
router.use(authenticate);

// Tenant isolation middleware for all routes below
router.use(tenantIsolation);

// Auth routes
router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);

// Admin-only routes
router.get('/users', requireAdmin, authController.getUsers);
router.post('/users/invite', requireAdmin, authController.inviteUser);
router.delete('/users/:id', requireAdmin, authController.removeUser);

module.exports = router;