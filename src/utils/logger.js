/**
 * Structured Logger Utility
 * Provides JSON-formatted logging with consistent structure
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Create a structured log entry
 * @param {string} level - Log level (ERROR, INFO, DEBUG)
 * @param {string} message - Log message
 * @param {Object} context - Additional context (messageId, senderId, etc.)
 * @returns {Object} - Structured log object
 */
function createLogEntry(level, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };
}

/**
 * Log at ERROR level with stack trace
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object or context
 * @param {Object} context - Additional context
 */
function error(message, error = null, context = {}) {
  const logEntry = createLogEntry(LOG_LEVELS.ERROR, message, {
    ...context,
    ...(error && error.stack ? { stack: error.stack } : {}),
    ...(error && error.message ? { errorMessage: error.message } : {})
  });
  console.error(JSON.stringify(logEntry));
}

/**
 * Log at INFO level
 * @param {string} message - Info message
 * @param {Object} context - Additional context
 */
function info(message, context = {}) {
  const logEntry = createLogEntry(LOG_LEVELS.INFO, message, context);
  console.log(JSON.stringify(logEntry));
}

/**
 * Log at DEBUG level
 * @param {string} message - Debug message
 * @param {Object} context - Additional context
 */
function debug(message, context = {}) {
  const logEntry = createLogEntry(LOG_LEVELS.DEBUG, message, context);
  console.log(JSON.stringify(logEntry));
}

module.exports = {
  error,
  info,
  debug,
  LOG_LEVELS
};
