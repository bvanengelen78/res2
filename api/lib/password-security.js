// Centralized Password Security Service
// Implements secure password policies, hashing, and validation

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { z } = require('zod');

// Password Security Configuration
const PASSWORD_CONFIG = {
  // Bcrypt configuration
  SALT_ROUNDS: 12, // Standardized across all endpoints
  
  // Password policy
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_LOWERCASE: true,
  REQUIRE_UPPERCASE: true,
  REQUIRE_DIGIT: true,
  REQUIRE_SPECIAL_CHAR: true,
  
  // Password generation
  GENERATED_PASSWORD_LENGTH: 16,
  EXCLUDE_AMBIGUOUS_CHARS: true,
  
  // Security settings
  MAX_PASSWORD_AGE_DAYS: 90,
  PREVENT_PASSWORD_REUSE_COUNT: 5,
  
  // Rate limiting
  MAX_RESET_ATTEMPTS_PER_HOUR: 3,
  MAX_FAILED_ATTEMPTS_BEFORE_LOCKOUT: 5
};

// Character sets for password generation
const CHAR_SETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ambiguous: '0O1lI' // Characters to exclude if EXCLUDE_AMBIGUOUS_CHARS is true
};

// Password validation schema
const passwordSchema = z.string()
  .min(PASSWORD_CONFIG.MIN_LENGTH, `Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters`)
  .max(PASSWORD_CONFIG.MAX_LENGTH, `Password must not exceed ${PASSWORD_CONFIG.MAX_LENGTH} characters`)
  .refine((password) => {
    if (PASSWORD_CONFIG.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      return false;
    }
    if (PASSWORD_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      return false;
    }
    if (PASSWORD_CONFIG.REQUIRE_DIGIT && !/\d/.test(password)) {
      return false;
    }
    if (PASSWORD_CONFIG.REQUIRE_SPECIAL_CHAR && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      return false;
    }
    return true;
  }, {
    message: 'Password must contain lowercase, uppercase, digit, and special character'
  });

class PasswordSecurityService {
  
  /**
   * Validate password against security policy
   */
  static validatePassword(password) {
    try {
      passwordSchema.parse(password);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        errors: error.errors.map(e => e.message) 
      };
    }
  }

  /**
   * Hash password with secure bcrypt settings
   */
  static async hashPassword(password) {
    try {
      // Validate password first
      const validation = this.validatePassword(password);
      if (!validation.valid) {
        throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
      }

      // Hash with standardized salt rounds
      const hashedPassword = await bcrypt.hash(password, PASSWORD_CONFIG.SALT_ROUNDS);
      
      return {
        success: true,
        hashedPassword,
        saltRounds: PASSWORD_CONFIG.SALT_ROUNDS
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password, hashedPassword) {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      return {
        success: true,
        isValid
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        isValid: false
      };
    }
  }

  /**
   * Generate secure password
   */
  static generateSecurePassword(length = PASSWORD_CONFIG.GENERATED_PASSWORD_LENGTH) {
    try {
      // Build character set
      let charset = '';
      
      if (PASSWORD_CONFIG.REQUIRE_LOWERCASE) {
        charset += CHAR_SETS.lowercase;
      }
      if (PASSWORD_CONFIG.REQUIRE_UPPERCASE) {
        charset += CHAR_SETS.uppercase;
      }
      if (PASSWORD_CONFIG.REQUIRE_DIGIT) {
        charset += CHAR_SETS.digits;
      }
      if (PASSWORD_CONFIG.REQUIRE_SPECIAL_CHAR) {
        charset += CHAR_SETS.special;
      }

      // Remove ambiguous characters if configured
      if (PASSWORD_CONFIG.EXCLUDE_AMBIGUOUS_CHARS) {
        charset = charset.split('').filter(char => !CHAR_SETS.ambiguous.includes(char)).join('');
      }

      // Generate password ensuring all required character types
      let password = '';
      
      // Ensure at least one character from each required set
      if (PASSWORD_CONFIG.REQUIRE_LOWERCASE) {
        password += this.getRandomChar(CHAR_SETS.lowercase);
      }
      if (PASSWORD_CONFIG.REQUIRE_UPPERCASE) {
        password += this.getRandomChar(CHAR_SETS.uppercase);
      }
      if (PASSWORD_CONFIG.REQUIRE_DIGIT) {
        password += this.getRandomChar(CHAR_SETS.digits);
      }
      if (PASSWORD_CONFIG.REQUIRE_SPECIAL_CHAR) {
        password += this.getRandomChar(CHAR_SETS.special);
      }

      // Fill remaining length with random characters from full charset
      for (let i = password.length; i < length; i++) {
        password += this.getRandomChar(charset);
      }

      // Shuffle the password to avoid predictable patterns
      password = this.shuffleString(password);

      // Validate generated password
      const validation = this.validatePassword(password);
      if (!validation.valid) {
        throw new Error('Generated password does not meet policy requirements');
      }

      return {
        success: true,
        password,
        length: password.length,
        policy: PASSWORD_CONFIG
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get cryptographically secure random character from charset
   */
  static getRandomChar(charset) {
    const randomBytes = crypto.randomBytes(1);
    const randomIndex = randomBytes[0] % charset.length;
    return charset[randomIndex];
  }

  /**
   * Shuffle string using Fisher-Yates algorithm
   */
  static shuffleString(str) {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const randomBytes = crypto.randomBytes(1);
      const j = randomBytes[0] % (i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

  /**
   * Check if password needs to be changed based on age
   */
  static isPasswordExpired(lastPasswordChange) {
    if (!lastPasswordChange) return true;
    
    const ageInDays = (Date.now() - new Date(lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays > PASSWORD_CONFIG.MAX_PASSWORD_AGE_DAYS;
  }

  /**
   * Get password strength score (0-100)
   */
  static getPasswordStrength(password) {
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Character variety scoring
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 15;
    
    return Math.min(score, 100);
  }

  /**
   * Get password policy information
   */
  static getPasswordPolicy() {
    return {
      minLength: PASSWORD_CONFIG.MIN_LENGTH,
      maxLength: PASSWORD_CONFIG.MAX_LENGTH,
      requireLowercase: PASSWORD_CONFIG.REQUIRE_LOWERCASE,
      requireUppercase: PASSWORD_CONFIG.REQUIRE_UPPERCASE,
      requireDigit: PASSWORD_CONFIG.REQUIRE_DIGIT,
      requireSpecialChar: PASSWORD_CONFIG.REQUIRE_SPECIAL_CHAR,
      maxPasswordAgeDays: PASSWORD_CONFIG.MAX_PASSWORD_AGE_DAYS,
      preventPasswordReuseCount: PASSWORD_CONFIG.PREVENT_PASSWORD_REUSE_COUNT
    };
  }
}

module.exports = {
  PasswordSecurityService,
  PASSWORD_CONFIG,
  passwordSchema
};
