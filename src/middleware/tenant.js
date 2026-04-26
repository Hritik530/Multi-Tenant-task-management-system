const prisma = require('../config/database');
const { forbidden } = require('../utils/errorHandler');

/**
 * Multi-tenancy middleware - ensures all data access is filtered by organization_id
 * This is the core of tenant isolation
 */
const tenantIsolation = async (req, res, next) => {
  try {
    if (!req.user) {
      return forbidden(res, 'User not authenticated');
    }

    // Attach organization ID to request for use in controllers
    req.organizationId = req.user.organizationId;
    
    next();
  } catch (error) {
    console.error('Tenant isolation error:', error);
    return forbidden(res, 'Tenant isolation failed');
  }
};

/**
 * Task access control - enforces RBAC on task operations
 */
const taskAccessControl = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const user = req.user;

    // If admin, allow all operations within their organization
    if (user.role === 'ADMIN') {
      return next();
    }

    // For members, check if they have access to the task
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          organizationId: user.organizationId,
        },
      });

      if (!task) {
        return forbidden(res, 'Task not found or access denied');
      }

      // Member can only access tasks they created or are assigned to
      const hasAccess = 
        task.createdBy === user.id || 
        task.assignedTo === user.id;

      if (!hasAccess) {
        return forbidden(res, 'You do not have permission to access this task');
      }
    }

    next();
  } catch (error) {
    console.error('Task access control error:', error);
    return forbidden(res, 'Access control failed');
  }
};

/**
 * Member task creation permission - members can only create tasks assigned to themselves
 */
const memberTaskCreationPermission = async (req, res, next) => {
  try {
    const user = req.user;

    // Admins can create tasks for anyone
    if (user.role === 'ADMIN') {
      return next();
    }

    // Members can only assign tasks to themselves
    const { assignedTo } = req.body;
    
    if (assignedTo && assignedTo !== user.id) {
      return forbidden(res, 'Members can only create tasks assigned to themselves');
    }

    // If no assignedTo specified, default to the creator
    req.body.assignedTo = user.id;

    next();
  } catch (error) {
    console.error('Member task creation permission error:', error);
    return forbidden(res, 'Permission check failed');
  }
};

/**
 * Member task update permission - members can only update tasks they created
 */
const memberTaskUpdatePermission = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const user = req.user;

    // Admins can update any task
    if (user.role === 'ADMIN') {
      return next();
    }

    // Members can only update tasks they created
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: user.organizationId,
      },
    });

    if (!task) {
      return forbidden(res, 'Task not found or access denied');
    }

    if (task.createdBy !== user.id) {
      return forbidden(res, 'You can only update tasks you created');
    }

    next();
  } catch (error) {
    console.error('Member task update permission error:', error);
    return forbidden(res, 'Permission check failed');
  }
};

/**
 * Member task deletion permission - members can only delete tasks they created
 */
const memberTaskDeletePermission = async (req, res, next) => {
  try {
    const { id: taskId } = req.params;
    const user = req.user;

    // Admins can delete any task
    if (user.role === 'ADMIN') {
      return next();
    }

    // Members can only delete tasks they created
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: user.organizationId,
      },
    });

    if (!task) {
      return forbidden(res, 'Task not found or access denied');
    }

    if (task.createdBy !== user.id) {
      return forbidden(res, 'You can only delete tasks you created');
    }

    next();
  } catch (error) {
    console.error('Member task delete permission error:', error);
    return forbidden(res, 'Permission check failed');
  }
};

/**
 * Audit log access control - admins see all, members see only their own
 */
const auditLogAccessControl = async (req, res, next) => {
  try {
    const user = req.user;

    // Attach filter to request based on role
    if (user.role === 'ADMIN') {
      req.auditLogFilter = {
        organizationId: user.organizationId,
      };
    } else {
      // Members can only see logs for tasks they created or are assigned to
      const userTaskIds = await prisma.task.findMany({
        where: {
          organizationId: user.organizationId,
          OR: [
            { createdBy: user.id },
            { assignedTo: user.id },
          ],
        },
        select: { id: true },
      });

      const taskIds = userTaskIds.map(t => t.id);
      
      req.auditLogFilter = {
        performedBy: user.id,
      };
      
      req.auditLogTaskIds = taskIds;
    }

    next();
  } catch (error) {
    console.error('Audit log access control error:', error);
    return forbidden(res, 'Audit log access failed');
  }
};

module.exports = {
  tenantIsolation,
  taskAccessControl,
  memberTaskCreationPermission,
  memberTaskUpdatePermission,
  memberTaskDeletePermission,
  auditLogAccessControl,
};