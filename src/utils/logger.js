/**
 * Logger Utility
 * Provides structured logging with different levels
 */

import config from "../config/index.js";

const LOG_LEVELS = {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG",
};

class Logger {
    /**
     * Format log message with timestamp and level
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {Object} meta - Additional metadata
     * @returns {string} Formatted log message
     */
    format(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : "";
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }

    /**
     * Log error message
     * @param {string} message - Error message
     * @param {Error|Object} error - Error object or metadata
     */
    error(message, error = {}) {
        const meta = error instanceof Error
            ? { error: error.message, stack: error.stack }
            : error;
        console.error(this.format(LOG_LEVELS.ERROR, message, meta));
    }

    /**
     * Log warning message
     * @param {string} message - Warning message
     * @param {Object} meta - Additional metadata
     */
    warn(message, meta = {}) {
        console.warn(this.format(LOG_LEVELS.WARN, message, meta));
    }

    /**
     * Log info message
     * @param {string} message - Info message
     * @param {Object} meta - Additional metadata
     */
    info(message, meta = {}) {
        console.log(this.format(LOG_LEVELS.INFO, message, meta));
    }

    /**
     * Log debug message (only in development)
     * @param {string} message - Debug message
     * @param {Object} meta - Additional metadata
     */
    debug(message, meta = {}) {
        if (config.server.isDevelopment) {
            console.log(this.format(LOG_LEVELS.DEBUG, message, meta));
        }
    }
}

export default new Logger();
