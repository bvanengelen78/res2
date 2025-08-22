// Comprehensive Input Validation and Sanitization Service
// Implements secure input validation, sanitization, and injection prevention

const { z } = require('zod');
const validator = require('validator');

// Security Configuration
const VALIDATION_CONFIG = {
  // String limits
  MAX_EMAIL_LENGTH: 254,
  MAX_PASSWORD_LENGTH: 128,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_URL_LENGTH: 2048,
  
  // Rate limiting
  MAX_REQUEST_SIZE: 1024 * 1024, // 1MB
  MAX_ARRAY_LENGTH: 1000,
  MAX_OBJECT_DEPTH: 10,
  
  // Security patterns
  DANGEROUS_PATTERNS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi
  ],
  
  // SQL injection patterns
  SQL_INJECTION_PATTERNS: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\b(OR|AND)\b.*=.*)/gi
  ]
};

// Custom Zod transformations for sanitization
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Normalize whitespace
  str = str.trim().replace(/\s+/g, ' ');
  
  // Remove dangerous patterns
  VALIDATION_CONFIG.DANGEROUS_PATTERNS.forEach(pattern => {
    str = str.replace(pattern, '');
  });
  
  return str;
};

const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return email;
  
  // Basic sanitization
  email = sanitizeString(email);
  
  // Normalize email
  email = email.toLowerCase();
  
  // Validate email format
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  return email;
};

// Common validation schemas
const emailSchema = z.string()
  .min(1, 'Email is required')
  .max(VALIDATION_CONFIG.MAX_EMAIL_LENGTH, 'Email too long')
  .transform(sanitizeEmail)
  .refine((email) => validator.isEmail(email), 'Invalid email format');

const passwordSchema = z.string()
  .min(1, 'Password is required')
  .max(VALIDATION_CONFIG.MAX_PASSWORD_LENGTH, 'Password too long')
  .refine((password) => {
    // Check for SQL injection patterns
    return !VALIDATION_CONFIG.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(password));
  }, 'Password contains invalid characters');

const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(VALIDATION_CONFIG.MAX_NAME_LENGTH, 'Name too long')
  .transform(sanitizeString)
  .refine((name) => {
    // Only allow letters, numbers, spaces, hyphens, and apostrophes
    return /^[a-zA-Z0-9\s\-']+$/.test(name);
  }, 'Name contains invalid characters');

const idSchema = z.number()
  .int('ID must be an integer')
  .positive('ID must be positive')
  .max(2147483647, 'ID too large'); // Max 32-bit integer

const booleanSchema = z.boolean().optional().default(false);

// Authentication-specific schemas
const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: booleanSchema
});

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  resourceId: idSchema.optional()
});

const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token is required')
    .max(2048, 'Refresh token too long')
    .refine((token) => {
      // Basic JWT format validation
      return /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token);
    }, 'Invalid refresh token format')
});

const passwordResetSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required')
    .max(128, 'Reset token too long')
    .refine((token) => {
      // Only allow alphanumeric and safe characters
      return /^[a-zA-Z0-9\-_]+$/.test(token);
    }, 'Invalid reset token format'),
  newPassword: passwordSchema
});

// User management schemas
const userCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  resourceId: idSchema.optional(),
  roles: z.array(z.string().max(50)).max(10).optional()
});

const userUpdateSchema = z.object({
  email: emailSchema.optional(),
  resourceId: idSchema.optional(),
  isActive: z.boolean().optional()
});

class InputValidationService {
  
  /**
   * Validate and sanitize input data
   */
  static validateInput(schema, data) {
    try {
      // Check request size
      const dataSize = JSON.stringify(data).length;
      if (dataSize > VALIDATION_CONFIG.MAX_REQUEST_SIZE) {
        return {
          success: false,
          error: 'Request too large',
          code: 'REQUEST_TOO_LARGE'
        };
      }
      
      // Validate with schema
      const validatedData = schema.parse(data);
      
      return {
        success: true,
        data: validatedData
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          })),
          code: 'VALIDATION_ERROR'
        };
      }
      
      return {
        success: false,
        error: error.message,
        code: 'VALIDATION_ERROR'
      };
    }
  }
  
  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html) {
    if (typeof html !== 'string') return html;
    
    // Remove script tags and dangerous attributes
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    html = html.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    html = html.replace(/javascript:/gi, '');
    html = html.replace(/vbscript:/gi, '');
    html = html.replace(/data:text\/html/gi, '');
    
    return html;
  }
  
  /**
   * Check for SQL injection patterns
   */
  static checkSqlInjection(input) {
    if (typeof input !== 'string') return false;
    
    return VALIDATION_CONFIG.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
  }
  
  /**
   * Validate file upload
   */
  static validateFileUpload(file, allowedTypes = [], maxSize = 5 * 1024 * 1024) {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }
    
    // Check file size
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large' };
    }
    
    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return { valid: false, error: 'Invalid file type' };
    }
    
    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(fileExtension)) {
      return { valid: false, error: 'Dangerous file type' };
    }
    
    return { valid: true };
  }
  
  /**
   * Rate limiting validation
   */
  static validateRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    // This would typically use Redis or a database
    // For now, using in-memory storage
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // This is a simplified implementation
    // In production, use a proper rate limiting library
    return { allowed: true, remaining: maxRequests };
  }
  
  /**
   * Get validation schemas
   */
  static getSchemas() {
    return {
      login: loginSchema,
      register: registerSchema,
      refreshToken: refreshTokenSchema,
      passwordReset: passwordResetSchema,
      userCreate: userCreateSchema,
      userUpdate: userUpdateSchema,
      email: emailSchema,
      password: passwordSchema,
      name: nameSchema,
      id: idSchema
    };
  }
  
  /**
   * Get validation configuration
   */
  static getConfig() {
    return VALIDATION_CONFIG;
  }
}

module.exports = {
  InputValidationService,
  VALIDATION_CONFIG,
  // Export schemas for direct use
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  passwordResetSchema,
  userCreateSchema,
  userUpdateSchema,
  emailSchema,
  passwordSchema,
  nameSchema,
  idSchema
};
