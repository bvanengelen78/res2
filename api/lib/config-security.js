// Secure Configuration Management Service
// Implements secure environment variable handling, secret validation, and configuration security

const crypto = require('crypto');

// Configuration Security Requirements
const CONFIG_REQUIREMENTS = {
  // Required environment variables
  REQUIRED_VARS: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  
  // Optional environment variables with defaults
  OPTIONAL_VARS: {
    'JWT_EXPIRES_IN': '15m',
    'JWT_REFRESH_EXPIRES_IN': '7d',
    'NODE_ENV': 'development',
    'PORT': '3000',
    'BCRYPT_SALT_ROUNDS': '12'
  },
  
  // Security validation rules
  VALIDATION_RULES: {
    'JWT_SECRET': {
      minLength: 32,
      pattern: /^[A-Za-z0-9+/=]+$/,
      description: 'Must be at least 32 characters, base64-like format'
    },
    'JWT_REFRESH_SECRET': {
      minLength: 32,
      pattern: /^[A-Za-z0-9+/=]+$/,
      description: 'Must be at least 32 characters, base64-like format'
    },
    'SUPABASE_URL': {
      pattern: /^https:\/\/[a-z0-9]+\.supabase\.co$/,
      description: 'Must be a valid Supabase URL'
    },
    'SUPABASE_SERVICE_ROLE_KEY': {
      minLength: 100,
      pattern: /^eyJ[A-Za-z0-9+/=]+$/,
      description: 'Must be a valid Supabase service role key (JWT format)'
    }
  },
  
  // Sensitive variables that should never be logged
  SENSITIVE_VARS: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_PASSWORD',
    'API_KEY',
    'PRIVATE_KEY'
  ],
  
  // Development vs Production requirements
  PRODUCTION_REQUIREMENTS: {
    'NODE_ENV': 'production',
    'JWT_SECRET': { mustNotBe: ['your-secret-key-change-in-production', 'development-secret'] },
    'JWT_REFRESH_SECRET': { mustNotBe: ['your-refresh-secret-key-change-in-production', 'development-refresh'] }
  }
};

class ConfigSecurityService {
  
  /**
   * Validate all environment configuration
   */
  static validateConfiguration() {
    const errors = [];
    const warnings = [];
    const config = {};
    
    // Check required variables
    for (const varName of CONFIG_REQUIREMENTS.REQUIRED_VARS) {
      const value = process.env[varName];
      
      if (!value) {
        errors.push(`Required environment variable ${varName} is not set`);
        continue;
      }
      
      // Validate against rules
      const rule = CONFIG_REQUIREMENTS.VALIDATION_RULES[varName];
      if (rule) {
        const validation = this.validateVariable(varName, value, rule);
        if (!validation.valid) {
          errors.push(`${varName}: ${validation.error}`);
        } else if (validation.warning) {
          warnings.push(`${varName}: ${validation.warning}`);
        }
      }
      
      config[varName] = value;
    }
    
    // Check optional variables
    for (const [varName, defaultValue] of Object.entries(CONFIG_REQUIREMENTS.OPTIONAL_VARS)) {
      const value = process.env[varName] || defaultValue;
      config[varName] = value;
    }
    
    // Production-specific validations
    if (process.env.NODE_ENV === 'production') {
      const prodValidation = this.validateProductionConfig();
      errors.push(...prodValidation.errors);
      warnings.push(...prodValidation.warnings);
    }
    
    // Check for secret conflicts
    const secretConflicts = this.checkSecretConflicts();
    errors.push(...secretConflicts);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config: this.sanitizeConfigForLogging(config)
    };
  }
  
  /**
   * Validate individual environment variable
   */
  static validateVariable(name, value, rule) {
    // Check minimum length
    if (rule.minLength && value.length < rule.minLength) {
      return {
        valid: false,
        error: `Must be at least ${rule.minLength} characters long. ${rule.description}`
      };
    }
    
    // Check pattern
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        valid: false,
        error: `Invalid format. ${rule.description}`
      };
    }
    
    // Check for common weak values
    const weakValues = ['password', '123456', 'secret', 'admin', 'test'];
    if (weakValues.some(weak => value.toLowerCase().includes(weak))) {
      return {
        valid: true,
        warning: 'Value appears to contain common weak patterns'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate production-specific requirements
   */
  static validateProductionConfig() {
    const errors = [];
    const warnings = [];
    
    for (const [varName, requirement] of Object.entries(CONFIG_REQUIREMENTS.PRODUCTION_REQUIREMENTS)) {
      const value = process.env[varName];
      
      if (typeof requirement === 'string') {
        if (value !== requirement) {
          errors.push(`${varName} must be set to '${requirement}' in production`);
        }
      } else if (requirement.mustNotBe) {
        if (requirement.mustNotBe.includes(value)) {
          errors.push(`${varName} is using a default/development value in production`);
        }
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Check for secret conflicts and reuse
   */
  static checkSecretConflicts() {
    const errors = [];
    const secrets = {};
    
    // Collect all secret values
    for (const varName of CONFIG_REQUIREMENTS.SENSITIVE_VARS) {
      const value = process.env[varName];
      if (value) {
        if (secrets[value]) {
          errors.push(`${varName} and ${secrets[value]} have the same value - secrets must be unique`);
        } else {
          secrets[value] = varName;
        }
      }
    }
    
    return errors;
  }
  
  /**
   * Generate secure random secret
   */
  static generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64');
  }
  
  /**
   * Sanitize configuration for logging (remove sensitive values)
   */
  static sanitizeConfigForLogging(config) {
    const sanitized = { ...config };
    
    for (const sensitiveVar of CONFIG_REQUIREMENTS.SENSITIVE_VARS) {
      if (sanitized[sensitiveVar]) {
        sanitized[sensitiveVar] = `[REDACTED:${sanitiveVar.substring(0, 8)}...]`;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Get secure configuration with validation
   */
  static getSecureConfig() {
    const validation = this.validateConfiguration();
    
    if (!validation.valid) {
      const errorMessage = `Configuration validation failed:\n${validation.errors.join('\n')}`;
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error(errorMessage);
      } else {
        console.error('[CONFIG_SECURITY] ' + errorMessage);
        if (validation.warnings.length > 0) {
          console.warn('[CONFIG_SECURITY] Warnings:\n' + validation.warnings.join('\n'));
        }
      }
    }
    
    return {
      // JWT Configuration
      jwt: {
        accessSecret: process.env.JWT_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: 'HS256',
        issuer: 'resourceflow-auth',
        audience: 'resourceflow-app'
      },
      
      // Database Configuration
      database: {
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      
      // Security Configuration
      security: {
        bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12'),
        environment: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT || '3000')
      },
      
      // Validation results
      validation: {
        valid: validation.valid,
        warnings: validation.warnings
      }
    };
  }
  
  /**
   * Check if running in secure environment
   */
  static isSecureEnvironment() {
    return process.env.NODE_ENV === 'production' && 
           process.env.HTTPS === 'true' &&
           process.env.JWT_SECRET !== 'your-secret-key-change-in-production';
  }
  
  /**
   * Get environment security status
   */
  static getSecurityStatus() {
    const validation = this.validateConfiguration();
    const isSecure = this.isSecureEnvironment();
    
    return {
      secure: isSecure && validation.valid,
      environment: process.env.NODE_ENV || 'development',
      configurationValid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      recommendations: this.getSecurityRecommendations()
    };
  }
  
  /**
   * Get security recommendations
   */
  static getSecurityRecommendations() {
    const recommendations = [];
    
    if (process.env.NODE_ENV !== 'production') {
      recommendations.push('Set NODE_ENV=production for production deployments');
    }
    
    if (!process.env.HTTPS) {
      recommendations.push('Enable HTTPS in production');
    }
    
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      recommendations.push('Use longer JWT secrets (64+ characters) for enhanced security');
    }
    
    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
      recommendations.push('Use different secrets for access and refresh tokens');
    }
    
    return recommendations;
  }
  
  /**
   * Initialize secure configuration on startup
   */
  static initialize() {
    console.log('[CONFIG_SECURITY] Initializing secure configuration...');
    
    const status = this.getSecurityStatus();
    
    if (!status.configurationValid) {
      console.error('[CONFIG_SECURITY] Configuration validation failed:');
      status.errors.forEach(error => console.error(`  - ${error}`));
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid configuration in production environment');
      }
    }
    
    if (status.warnings.length > 0) {
      console.warn('[CONFIG_SECURITY] Configuration warnings:');
      status.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    if (status.recommendations.length > 0) {
      console.info('[CONFIG_SECURITY] Security recommendations:');
      status.recommendations.forEach(rec => console.info(`  - ${rec}`));
    }
    
    console.log(`[CONFIG_SECURITY] Environment: ${status.environment}`);
    console.log(`[CONFIG_SECURITY] Secure: ${status.secure ? 'YES' : 'NO'}`);
    
    return status;
  }
}

module.exports = {
  ConfigSecurityService,
  CONFIG_REQUIREMENTS
};
