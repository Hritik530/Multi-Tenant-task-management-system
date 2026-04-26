const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, requireAdmin, requireMember } = require('../middleware/auth');
const { 
  tenantIsolation, 
  taskAccessControl,
  memberTaskCreationPermission,
  memberTaskUpdatePermission,
  memberTaskDeletePermission
} = require('../middleware/tenant');

// All task routes require authentication
router.use(authenticate);
router.use(tenantIsolation);

// CRUD operations
router.post('/', requireMember, memberTaskCreationPermission, taskController.createTask);
router.get('/', requireMember, taskController.getTasks);
router.get('/:id', requireMember, taskAccessControl, taskController.getTask);
router.put('/:id', requireMember, memberTaskUpdatePermission, taskController.updateTask);
router.delete('/:id', requireMember, memberTaskDeletePermission, taskController.deleteTask);

module.exports = router;