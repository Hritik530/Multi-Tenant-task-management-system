const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * Standard error response format
 */
const errorResponse = (res, statusCode, message, code = 'ERROR') => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
  });
};

/**
 * Success response format
 */
const successResponse = (res, statusCode, data, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Not found error
 */
const notFound = (res, resource = 'Resource') => {
  return errorResponse(res, 404, `${resource} not found`, 'NOT_FOUND');
};

/**
 * Bad request error
 */
const badRequest = (res, message) => {
  return errorResponse(res, 400, message, 'BAD_REQUEST');
};

/**
 * Unauthorized error
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return errorResponse(res, 401, message, 'UNAUTHORIZED');
};

/**
 * Forbidden error
 */
const forbidden = (res, message = 'Forbidden') => {
  return errorResponse(res, 403, message, 'FORBIDDEN');
};

/**
 * Internal server error
 */
const internalError = (res, message = 'Internal server error') => {
  logger.error(message);
  return errorResponse(res, 500, message, 'INTERNAL_ERROR');
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Don't expose stack trace in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  return errorResponse(res, err.statusCode || 500, message, err.code || 'INTERNAL_ERROR');
};

/**
 * Async handler wrapper to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  logger,
  errorResponse,
  successResponse,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  internalError,
  globalErrorHandler,
  asyncHandler,
};