// Security Logging and Error Handling Service
// Implements secure logging, audit trails, and error handling that doesn't leak sensitive information

const fs = require('fs').promises;
const path = require('path');

// Security Logging Configuration
const LOGGING_CONFIG = {
  // Log levels
  LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  },
  
  // Security event types
  SECURITY_EVENTS: {
    AUTH_SUCCESS: 'auth_success',
    AUTH_FAILURE: 'auth_failure',
    AUTH_LOCKOUT: 'auth_lockout',
    TOKEN_ISSUED: 'token_issued',
    TOKEN_REVOKED: 'token_revoked',
    TOKEN_EXPIRED: 'token_expired',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    CONFIG_ERROR: 'config_error',
    SECURITY_VIOLATION: 'security_violation',
    DATA_ACCESS: 'data_access',
    PRIVILEGE_ESCALATION: 'privilege_escalation'
  },
  
  // Sensitive fields to redact
  SENSITIVE_FIELDS: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'jwt',
    'refresh_token',
    'access_token'
  ],
  
  // Log retention
  MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_LOG_FILES: 10,
  LOG_ROTATION_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  
  // Output configuration
  CONSOLE_ENABLED: process.env.NODE_ENV !== 'production',
  FILE_ENABLED: true,
  LOG_DIRECTORY: process.env.LOG_DIRECTORY || './logs'
};

class SecurityLogger {
  constructor() {
    this.logBuffer = [];
    this.lastRotation = Date.now();
    this.initializeLogDirectory();
  }
  
  /**
   * Initialize log directory
   */
  async initializeLogDirectory() {
    try {
      await fs.mkdir(LOGGING_CONFIG.LOG_DIRECTORY, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error.message);
    }
  }
  
  /**
   * Log security event
   */
  logSecurityEvent(eventType, message, context = {}, level = 'INFO') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      eventType,
      message,
      context: this.sanitizeContext(context),
      requestId: context.requestId || this.generateRequestId(),
      sessionId: context.sessionId,
      userId: context.userId,
      ip: context.clientIP || context.ip,
      userAgent: context.userAgent,
      endpoint: context.endpoint || context.url,
      method: context.method
    };
    
    // Add to buffer
    this.logBuffer.push(logEntry);
    
    // Console output for development
    if (LOGGING_CONFIG.CONSOLE_ENABLED) {
      this.outputToConsole(logEntry);
    }
    
    // File output
    if (LOGGING_CONFIG.FILE_ENABLED) {
      this.outputToFile(logEntry);
    }
    
    // Check for log rotation
    this.checkLogRotation();
    
    return logEntry;
  }
  
  /**
   * Sanitize context to remove sensitive information
   */
  sanitizeContext(context) {
    const sanitized = { ...context };
    
    // Remove sensitive fields
    for (const field of LOGGING_CONFIG.SENSITIVE_FIELDS) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    // Sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeNestedObject(value);
      }
    }
    
    // Limit context size
    const contextString = JSON.stringify(sanitized);
    if (contextString.length > 10000) {
      sanitized._truncated = true;
      sanitized._originalSize = contextString.length;
      // Keep only essential fields
      const essential = {
        userId: sanitized.userId,
        ip: sanitized.ip,
        endpoint: sanitized.endpoint,
        method: sanitized.method,
        error: sanitized.error
      };
      return essential;
    }
    
    return sanitized;
  }
  
  /**
   * Sanitize nested objects
   */
  sanitizeNestedObject(obj, depth = 0) {
    if (depth > 3) return '[DEEP_OBJECT]'; // Prevent infinite recursion
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (LOGGING_CONFIG.SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeNestedObject(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  /**
   * Output log entry to console
   */
  outputToConsole(logEntry) {
    const colorMap = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m', // White
      TRACE: '\x1b[90m'  // Gray
    };
    
    const color = colorMap[logEntry.level] || '\x1b[37m';
    const reset = '\x1b[0m';
    
    console.log(
      `${color}[${logEntry.timestamp}] ${logEntry.level} [${logEntry.eventType}] ${logEntry.message}${reset}`
    );
    
    if (logEntry.context && Object.keys(logEntry.context).length > 0) {
      console.log(`${color}Context:${reset}`, JSON.stringify(logEntry.context, null, 2));
    }
  }
  
  /**
   * Output log entry to file
   */
  async outputToFile(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      const logFile = path.join(LOGGING_CONFIG.LOG_DIRECTORY, 'security.log');
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }
  
  /**
   * Check if log rotation is needed
   */
  async checkLogRotation() {
    const now = Date.now();
    if (now - this.lastRotation > LOGGING_CONFIG.LOG_ROTATION_INTERVAL) {
      await this.rotateLogFiles();
      this.lastRotation = now;
    }
  }
  
  /**
   * Rotate log files
   */
  async rotateLogFiles() {
    try {
      const logFile = path.join(LOGGING_CONFIG.LOG_DIRECTORY, 'security.log');
      const stats = await fs.stat(logFile).catch(() => null);
      
      if (stats && stats.size > LOGGING_CONFIG.MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = path.join(LOGGING_CONFIG.LOG_DIRECTORY, `security-${timestamp}.log`);
        
        await fs.rename(logFile, rotatedFile);
        
        // Clean up old log files
        await this.cleanupOldLogs();
      }
    } catch (error) {
      console.error('Failed to rotate log files:', error.message);
    }
  }
  
  /**
   * Clean up old log files
   */
  async cleanupOldLogs() {
    try {
      const files = await fs.readdir(LOGGING_CONFIG.LOG_DIRECTORY);
      const logFiles = files
        .filter(file => file.startsWith('security-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(LOGGING_CONFIG.LOG_DIRECTORY, file),
          time: fs.stat(path.join(LOGGING_CONFIG.LOG_DIRECTORY, file)).then(stats => stats.mtime)
        }));
      
      if (logFiles.length > LOGGING_CONFIG.MAX_LOG_FILES) {
        // Sort by modification time and remove oldest files
        const sortedFiles = await Promise.all(
          logFiles.map(async file => ({
            ...file,
            time: await file.time
          }))
        );
        
        sortedFiles.sort((a, b) => a.time - b.time);
        const filesToDelete = sortedFiles.slice(0, sortedFiles.length - LOGGING_CONFIG.MAX_LOG_FILES);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error.message);
    }
  }
  
  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get audit trail for user
   */
  async getAuditTrail(userId, limit = 100) {
    try {
      const logFile = path.join(LOGGING_CONFIG.LOG_DIRECTORY, 'security.log');
      const content = await fs.readFile(logFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      const userLogs = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log && log.userId === userId)
        .slice(-limit);
      
      return userLogs;
    } catch (error) {
      console.error('Failed to get audit trail:', error.message);
      return [];
    }
  }
  
  /**
   * Get security statistics
   */
  getSecurityStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentLogs = this.logBuffer.filter(log => 
      now - new Date(log.timestamp).getTime() < oneHour
    );
    
    const eventCounts = {};
    for (const log of recentLogs) {
      eventCounts[log.eventType] = (eventCounts[log.eventType] || 0) + 1;
    }
    
    return {
      totalLogs: this.logBuffer.length,
      recentLogs: recentLogs.length,
      eventCounts,
      config: LOGGING_CONFIG
    };
  }
}

// Secure Error Handler
class SecureErrorHandler {
  
  /**
   * Create secure error response
   */
  static createErrorResponse(error, context = {}) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Determine error type and safe message
    let statusCode = 500;
    let safeMessage = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error.name === 'ValidationError') {
      statusCode = 400;
      safeMessage = 'Invalid input data';
      errorCode = 'VALIDATION_ERROR';
    } else if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
      statusCode = 401;
      safeMessage = 'Authentication required';
      errorCode = 'UNAUTHORIZED';
    } else if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
      statusCode = 403;
      safeMessage = 'Access denied';
      errorCode = 'FORBIDDEN';
    } else if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      statusCode = 404;
      safeMessage = 'Resource not found';
      errorCode = 'NOT_FOUND';
    }
    
    // Log the actual error securely
    securityLogger.logSecurityEvent(
      LOGGING_CONFIG.SECURITY_EVENTS.SECURITY_VIOLATION,
      `Error occurred: ${error.message}`,
      {
        ...context,
        error: {
          name: error.name,
          message: error.message,
          stack: isDevelopment ? error.stack : '[REDACTED]'
        },
        statusCode
      },
      'ERROR'
    );
    
    // Return safe error response
    const response = {
      error: true,
      message: safeMessage,
      code: errorCode,
      timestamp: new Date().toISOString()
    };
    
    // Include detailed error info only in development
    if (isDevelopment) {
      response.details = {
        originalMessage: error.message,
        stack: error.stack
      };
    }
    
    return { statusCode, response };
  }
  
  /**
   * Express error handler middleware
   */
  static middleware() {
    return (error, req, res, next) => {
      const context = {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      };
      
      const { statusCode, response } = this.createErrorResponse(error, context);
      res.status(statusCode).json(response);
    };
  }
}

// Create singleton instance
const securityLogger = new SecurityLogger();

module.exports = {
  SecurityLogger,
  SecureErrorHandler,
  securityLogger,
  LOGGING_CONFIG
};
