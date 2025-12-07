/**
 * Global Error Handler Middleware
 * Catches all errors and sends consistent error responses
 */

import logger from "../utils/logger.js";
import config from "../config/index.js";

/**
 * Custom API Error class
 */
export class ApiError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, next) {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Log the error
    logger.error("Request error", {
        path: req.path,
        method: req.method,
        statusCode,
        message,
        stack: config.server.isDevelopment ? err.stack : undefined,
    });

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(config.server.isDevelopment && { stack: err.stack }),
        },
    });
}

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            message: `Route ${req.originalUrl} not found`,
        },
    });
}

export default errorHandler;
