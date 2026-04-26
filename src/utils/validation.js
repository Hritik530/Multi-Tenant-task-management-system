const Joi = require('joi');

/**
 * Validate request body against a schema
 */
const validate = (schema, data) => {
  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

/**
 * Validate request params against a schema
 */
const validateParams = (schema, data) => {
  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
};

/**
 * Validation schemas
 */

// Register validation schema
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  organizationName: Joi.string().min(2).max(100).required(),
});

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Refresh token schema
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// Task creation schema
const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE'),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
  assignedTo: Joi.string().uuid().allow(null),
  dueDate: Joi.date().iso().allow(null),
});

// Task update schema
const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('TODO', 'IN_PROGRESS', 'DONE'),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
  assignedTo: Joi.string().uuid().allow(null),
  dueDate: Joi.date().iso().allow(null),
});

// Task ID parameter schema
const taskIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// UUID parameter schema
const uuidParamSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

module.exports = {
  validate,
  validateParams,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  uuidParamSchema,
};