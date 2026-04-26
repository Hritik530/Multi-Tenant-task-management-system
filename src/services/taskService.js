const prisma = require('../config/database');

/**
 * Create a new task
 */
const createTask = async (data) => {
  const { title, description, status, priority, assignedTo, dueDate, createdBy, organizationId } = data;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      assignedTo,
      dueDate,
      createdBy,
      organizationId,
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      assignedToUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return task;
};

/**
 * Get all tasks for an organization (filtered by role)
 */
const getTasks = async (filters) => {
  const { organizationId, userId, role } = filters;

  let where = {
    organizationId,
  };

  // If member, only show tasks they created or are assigned to
  if (role === 'MEMBER') {
    where = {
      ...where,
      OR: [
        { createdBy: userId },
        { assignedTo: userId },
      ],
    };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      assignedToUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tasks;
};

/**
 * Get a single task by ID
 */
const getTaskById = async (taskId, organizationId) => {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId,
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      assignedToUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return task;
};

/**
 * Update a task
 */
const updateTask = async (taskId, data, organizationId) => {
  // Get old task for audit log
  const oldTask = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId,
    },
  });

  if (!oldTask) {
    throw new Error('Task not found');
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      assignedToUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return { task, oldTask };
};

/**
 * Delete a task
 */
const deleteTask = async (taskId, organizationId) => {
  // Get task for audit log before deletion
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId,
    },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return task;
};

/**
 * Get tasks for a specific user (created by or assigned to)
 */
const getUserTasks = async (userId, organizationId) => {
  const tasks = await prisma.task.findMany({
    where: {
      organizationId,
      OR: [
        { createdBy: userId },
        { assignedTo: userId },
      ],
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      assignedToUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tasks;
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getUserTasks,
};