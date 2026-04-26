const taskService = require('../services/taskService');
const auditLogService = require('../services/auditLogService');
const { successResponse, badRequest, notFound, internalError } = require('../utils/errorHandler');
const { validate, validateParams } = require('../utils/validation');
const { createTaskSchema, updateTaskSchema, taskIdSchema } = require('../utils/validation');

/**
 * Create a new task
 */
const createTask = async (req, res, next) => {
  try {
    // Validate request
    const { error, value } = validate(createTaskSchema, req.body);
    if (error) {
      return badRequest(res, error.details[0].message);
    }

    // Create task with organization ID from authenticated user
    const task = await taskService.createTask({
      ...value,
      createdBy: req.user.id,
      organizationId: req.organizationId,
    });

    // Log task creation
    await auditLogService.logTaskCreated(task, req.user.id);

    return successResponse(res, 201, task, 'Task created successfully');
  } catch (error) {
    console.error('Create task error:', error);
    return internalError(res);
  }
};

/**
 * Get all tasks (filtered by role)
 */
const getTasks = async (req, res, next) => {
  try {
    const tasks = await taskService.getTasks({
      organizationId: req.organizationId,
      userId: req.user.id,
      role: req.user.role,
    });

    return successResponse(res, 200, tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    return internalError(res);
  }
};

/**
 * Get a single task by ID
 */
const getTask = async (req, res, next) => {
  try {
    // Validate task ID
    const { error, value } = validateParams(taskIdSchema, req.params);
    if (error) {
      return badRequest(res, error.details[0].message);
    }

    const task = await taskService.getTaskById(value.id, req.organizationId);

    if (!task) {
      return notFound(res, 'Task');
    }

    return successResponse(res, 200, task);
  } catch (error) {
    console.error('Get task error:', error);
    return internalError(res);
  }
};

/**
 * Update a task
 */
const updateTask = async (req, res, next) => {
  try {
    // Validate task ID
    const { error: paramError, value: paramValue } = validateParams(taskIdSchema, req.params);
    if (paramError) {
      return badRequest(res, paramError.details[0].message);
    }

    // Validate request body
    const { error, value } = validate(updateTaskSchema, req.body);
    if (error) {
      return badRequest(res, error.details[0].message);
    }

    // Update task
    const { task: updatedTask, oldTask } = await taskService.updateTask(
      paramValue.id,
      value,
      req.organizationId
    );

    // Log task update
    await auditLogService.logTaskUpdated(paramValue.id, oldTask, updatedTask, req.user.id);

    return successResponse(res, 200, updatedTask, 'Task updated successfully');
  } catch (error) {
    console.error('Update task error:', error);
    
    if (error.message === 'Task not found') {
      return notFound(res, 'Task');
    }
    
    return internalError(res);
  }
};

/**
 * Delete a task
 */
const deleteTask = async (req, res, next) => {
  try {
    // Validate task ID
    const { error, value } = validateParams(taskIdSchema, req.params);
    if (error) {
      return badRequest(res, error.details[0].message);
    }

    // Delete task
    const deletedTask = await taskService.deleteTask(value.id, req.organizationId);

    // Log task deletion
    await auditLogService.logTaskDeleted(deletedTask, req.user.id);

    return successResponse(res, 200, null, 'Task deleted successfully');
  } catch (error) {
    console.error('Delete task error:', error);
    
    if (error.message === 'Task not found') {
      return notFound(res, 'Task');
    }
    
    return internalError(res);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
};