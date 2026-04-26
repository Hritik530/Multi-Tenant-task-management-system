const prisma = require('../config/database');

const ACTION_TYPES = {
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_DELETED: 'TASK_DELETED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  STATUS_CHANGED: 'STATUS_CHANGED',
};

/**
 * Create an audit log entry
 */
const createAuditLog = async (data) => {
  const { actionType, taskId, performedBy, organizationId, oldValue, newValue } = data;

  const auditLog = await prisma.auditLog.create({
    data: {
      actionType,
      taskId,
      performedBy,
      organizationId,
      oldValue,
      newValue,
    },
    include: {
      performedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return auditLog;
};

/**
 * Get all audit logs for an organization (admin) or user (member)
 */
const getAuditLogs = async (filters) => {
  const { organizationId, userId, role, taskIds } = filters;

  let where = {
    organizationId,
  };

  // If member, only show logs for tasks they created or are assigned to
  if (role === 'MEMBER' && taskIds && taskIds.length > 0) {
    where = {
      ...where,
      taskId: { in: taskIds },
    };
  }

  const auditLogs = await prisma.auditLog.findMany({
    where,
    include: {
      performedByUser: {
        select: { id: true, name: true, email: true },
      },
      task: {
        select: { id: true, title: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return auditLogs;
};

/**
 * Get audit logs for a specific task
 */
const getTaskAuditLogs = async (taskId, organizationId) => {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      taskId,
      organizationId,
    },
    include: {
      performedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return auditLogs;
};

/**
 * Log task creation
 */
const logTaskCreated = async (task, userId) => {
  return createAuditLog({
    actionType: ACTION_TYPES.TASK_CREATED,
    taskId: task.id,
    performedBy: userId,
    organizationId: task.organizationId,
    oldValue: null,
    newValue: {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
    },
  });
};

/**
 * Log task update
 */
const logTaskUpdated = async (taskId, oldTask, newTask, userId) => {
  // Determine action type
  let actionType = ACTION_TYPES.TASK_UPDATED;
  
  if (oldTask.status !== newTask.status) {
    actionType = ACTION_TYPES.STATUS_CHANGED;
  } else if (oldTask.assignedTo !== newTask.assignedTo) {
    actionType = ACTION_TYPES.TASK_ASSIGNED;
  }

  return createAuditLog({
    actionType,
    taskId,
    performedBy: userId,
    organizationId: oldTask.organizationId,
    oldValue: {
      title: oldTask.title,
      description: oldTask.description,
      status: oldTask.status,
      priority: oldTask.priority,
      assignedTo: oldTask.assignedTo,
      dueDate: oldTask.dueDate,
    },
    newValue: {
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      priority: newTask.priority,
      assignedTo: newTask.assignedTo,
      dueDate: newTask.dueDate,
    },
  });
};

/**
 * Log task deletion
 */
const logTaskDeleted = async (task, userId) => {
  return createAuditLog({
    actionType: ACTION_TYPES.TASK_DELETED,
    taskId: task.id,
    performedBy: userId,
    organizationId: task.organizationId,
    oldValue: {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
    },
    newValue: null,
  });
};

module.exports = {
  ACTION_TYPES,
  createAuditLog,
  getAuditLogs,
  getTaskAuditLogs,
  logTaskCreated,
  logTaskUpdated,
  logTaskDeleted,
};