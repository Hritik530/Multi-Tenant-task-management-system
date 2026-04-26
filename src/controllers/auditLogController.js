const auditLogService = require('../services/auditLogService');
const prisma = require('../config/database');
const { successResponse, badRequest, notFound, internalError } = require('../utils/errorHandler');
const { validateParams } = require('../utils/validation');
const { taskIdSchema } = require('../utils/validation');

/**
 * Get all audit logs (filtered by role)
 */
const getAuditLogs = async (req, res, next) => {
  try {
    // Get user's task IDs for member filtering
    let taskIds = [];
    if (req.user.role === 'MEMBER') {
      const userTasks = await prisma.task.findMany({
        where: {
          organizationId: req.organizationId,
          OR: [
            { createdBy: req.user.id },
            { assignedTo: req.user.id },
          ],
        },
        select: { id: true },
      });
      taskIds = userTasks.map(t => t.id);
    }

    const auditLogs = await auditLogService.getAuditLogs({
      organizationId: req.organizationId,
      userId: req.user.id,
      role: req.user.role,
      taskIds,
    });

    return successResponse(res, 200, auditLogs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return internalError(res);
  }
};

/**
 * Get audit logs for a specific task
 */
const getTaskAuditLogs = async (req, res, next) => {
  try {
    // Validate task ID
    const { error, value } = validateParams(taskIdSchema, req.params);
    if (error) {
      return badRequest(res, error.details[0].message);
    }

    const { taskId } = req.params;

    // Verify task belongs to user's organization
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: req.organizationId,
      },
    });

    if (!task) {
      return notFound(res, 'Task');
    }

    // For members, check if they have access to the task
    if (req.user.role === 'MEMBER') {
      const hasAccess = 
        task.createdBy === req.user.id || 
        task.assignedTo === req.user.id;

      if (!hasAccess) {
        return badRequest(res, 'You do not have permission to view audit logs for this task');
      }
    }

    const auditLogs = await auditLogService.getTaskAuditLogs(taskId, req.organizationId);

    return successResponse(res, 200, auditLogs);
  } catch (error) {
    console.error('Get task audit logs error:', error);
    return internalError(res);
  }
};

module.exports = {
  getAuditLogs,
  getTaskAuditLogs,
};