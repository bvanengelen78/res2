// Enterprise Authentication Service
// Production-ready authentication with database integration, security features, and audit logging

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { DatabaseService } = require('./supabase');
const { AuditLogger, AUDIT_EVENTS } = require('./audit-logger');

// Configuration constants
const BCRYPT_SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const TOKEN_EXPIRY_SHORT = '1d';
const TOKEN_EXPIRY_LONG = '30d';

// In-memory rate limiting (for production, consider Redis)
const loginAttempts = new Map();
const accountLockouts = new Map();

// Standalone logger for authentication events
const AuthLogger = {
  info: (message, context = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      service: 'auth',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  
  warn: (message, context = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      service: 'auth',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  
  error: (message, error = null, context = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      service: 'auth',
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : null,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  
  security: (event, context = {}) => {
    console.log(JSON.stringify({
      level: 'security',
      service: 'auth',
      event,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
};

class AuthenticationService {
  
  /**
   * Authenticate user with email and password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @param {string} clientIP - Client IP address
   * @param {string} userAgent - User agent string
   * @param {boolean} rememberMe - Extended session flag
   * @returns {Object} Authentication result
   */
  static async authenticateUser(email, password, clientIP, userAgent, rememberMe = false) {
    const authContext = {
      email,
      clientIP,
      userAgent,
      rememberMe,
      timestamp: new Date().toISOString()
    };

    try {
      AuthLogger.info('Authentication attempt started', authContext);

      // Log authentication attempt
      await AuditLogger.logAuthEvent(AUDIT_EVENTS.LOGIN_ATTEMPT, authContext);

      // Input validation
      const validation = this.validateLoginInput(email, password);
      if (!validation.valid) {
        AuthLogger.warn('Authentication failed - invalid input', {
          ...authContext,
          error: validation.error
        });

        await AuditLogger.logAuthEvent(AUDIT_EVENTS.LOGIN_FAILURE, {
          ...authContext,
          reason: 'invalid_input',
          error: validation.error
        });

        return {
          success: false,
          error: validation.error,
          code: 'INVALID_INPUT'
        };
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check account lockout
      const lockoutCheck = this.checkAccountLockout(normalizedEmail, clientIP);
      if (!lockoutCheck.allowed) {
        AuthLogger.security('Authentication blocked - account locked', {
          ...authContext,
          email: normalizedEmail,
          lockoutReason: lockoutCheck.reason,
          unlockTime: lockoutCheck.unlockTime
        });
        return {
          success: false,
          error: 'Account temporarily locked due to multiple failed attempts',
          code: 'ACCOUNT_LOCKED',
          unlockTime: lockoutCheck.unlockTime
        };
      }

      // Database user lookup
      const user = await this.getUserByEmail(normalizedEmail);
      if (!user) {
        this.recordFailedAttempt(normalizedEmail, clientIP);
        AuthLogger.security('Authentication failed - user not found', {
          ...authContext,
          email: normalizedEmail
        });

        await AuditLogger.logAuthEvent(AUDIT_EVENTS.LOGIN_FAILURE, {
          ...authContext,
          email: normalizedEmail,
          reason: 'user_not_found'
        });

        return {
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Check if user is active
      if (!user.is_active) {
        AuthLogger.security('Authentication failed - inactive user', {
          ...authContext,
          userId: user.id,
          email: normalizedEmail
        });
        return {
          success: false,
          error: 'Account is disabled',
          code: 'ACCOUNT_DISABLED'
        };
      }

      // Password verification
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        this.recordFailedAttempt(normalizedEmail, clientIP);
        AuthLogger.security('Authentication failed - invalid password', {
          ...authContext,
          userId: user.id,
          email: normalizedEmail
        });

        await AuditLogger.logAuthEvent(AUDIT_EVENTS.LOGIN_FAILURE, {
          ...authContext,
          userId: user.id,
          email: normalizedEmail,
          reason: 'invalid_password'
        });

        return {
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        };
      }

      // Clear failed attempts on successful login
      this.clearFailedAttempts(normalizedEmail, clientIP);

      // Get user roles and permissions
      const userRoles = await this.getUserRoles(user.id);
      const permissions = this.getPermissionsForRoles(userRoles);

      // Generate JWT tokens
      const tokens = this.generateTokens(user, userRoles, permissions, rememberMe);

      // Update last login
      await this.updateLastLogin(user.id);

      // Prepare user data response
      const userData = {
        id: user.id,
        email: user.email,
        resourceId: user.resource_id,
        roles: userRoles.map(role => ({ role: role.role })),
        permissions,
        resource: user.resource_id ? await this.getResourceData(user.resource_id) : null
      };

      AuthLogger.security('Authentication successful', {
        ...authContext,
        userId: user.id,
        email: normalizedEmail,
        roles: userRoles.map(r => r.role),
        permissionCount: permissions.length
      });

      // Log successful authentication
      await AuditLogger.logAuthEvent(AUDIT_EVENTS.LOGIN_SUCCESS, {
        ...authContext,
        userId: user.id,
        email: normalizedEmail,
        roles: userRoles.map(r => r.role),
        rememberMe
      });

      return {
        success: true,
        user: userData,
        tokens,
        sessionInfo: {
          loginTime: new Date().toISOString(),
          expiresAt: new Date(Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)).toISOString()
        }
      };

    } catch (error) {
      AuthLogger.error('Authentication system error', error, authContext);
      return {
        success: false,
        error: 'Authentication service unavailable',
        code: 'SYSTEM_ERROR'
      };
    }
  }

  /**
   * Validate login input
   */
  static validateLoginInput(email, password) {
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      return { valid: false, error: 'Valid email is required' };
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      return { valid: false, error: 'Password is required' };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Check if account is locked out
   */
  static checkAccountLockout(email, clientIP) {
    const emailKey = `email:${email}`;
    const ipKey = `ip:${clientIP}`;
    const now = Date.now();

    // Check email-based lockout
    if (accountLockouts.has(emailKey)) {
      const lockout = accountLockouts.get(emailKey);
      if (now < lockout.unlockTime) {
        return {
          allowed: false,
          reason: 'email_lockout',
          unlockTime: new Date(lockout.unlockTime).toISOString()
        };
      } else {
        accountLockouts.delete(emailKey);
      }
    }

    // Check IP-based lockout
    if (accountLockouts.has(ipKey)) {
      const lockout = accountLockouts.get(ipKey);
      if (now < lockout.unlockTime) {
        return {
          allowed: false,
          reason: 'ip_lockout',
          unlockTime: new Date(lockout.unlockTime).toISOString()
        };
      } else {
        accountLockouts.delete(ipKey);
      }
    }

    return { allowed: true };
  }

  /**
   * Record failed login attempt
   */
  static recordFailedAttempt(email, clientIP) {
    const emailKey = `email:${email}`;
    const ipKey = `ip:${clientIP}`;
    const now = Date.now();

    // Track email-based attempts
    if (!loginAttempts.has(emailKey)) {
      loginAttempts.set(emailKey, { count: 0, firstAttempt: now });
    }
    const emailAttempts = loginAttempts.get(emailKey);
    emailAttempts.count++;

    // Track IP-based attempts
    if (!loginAttempts.has(ipKey)) {
      loginAttempts.set(ipKey, { count: 0, firstAttempt: now });
    }
    const ipAttempts = loginAttempts.get(ipKey);
    ipAttempts.count++;

    // Lock account if max attempts reached
    if (emailAttempts.count >= MAX_LOGIN_ATTEMPTS) {
      accountLockouts.set(emailKey, {
        lockedAt: now,
        unlockTime: now + LOCKOUT_DURATION,
        reason: 'max_attempts'
      });
      AuthLogger.security('Account locked due to failed attempts', {
        email,
        attempts: emailAttempts.count,
        lockoutDuration: LOCKOUT_DURATION
      });
    }

    if (ipAttempts.count >= MAX_LOGIN_ATTEMPTS) {
      accountLockouts.set(ipKey, {
        lockedAt: now,
        unlockTime: now + LOCKOUT_DURATION,
        reason: 'max_attempts'
      });
      AuthLogger.security('IP locked due to failed attempts', {
        clientIP,
        attempts: ipAttempts.count,
        lockoutDuration: LOCKOUT_DURATION
      });
    }
  }

  /**
   * Clear failed attempts on successful login
   */
  static clearFailedAttempts(email, clientIP) {
    const emailKey = `email:${email}`;
    const ipKey = `ip:${clientIP}`;
    
    loginAttempts.delete(emailKey);
    loginAttempts.delete(ipKey);
    accountLockouts.delete(emailKey);
    accountLockouts.delete(ipKey);
  }

  /**
   * Get user by email from database
   */
  static async getUserByEmail(email) {
    try {
      const result = await DatabaseService.query(
        'SELECT id, email, password, resource_id, is_active, email_verified, last_login FROM public.users WHERE email = $1 AND is_active = true',
        [email]
      );
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      AuthLogger.error('Database error fetching user', error, { email });
      throw error;
    }
  }

  /**
   * Get user roles from database
   */
  static async getUserRoles(userId) {
    try {
      const result = await DatabaseService.query(
        'SELECT role, assigned_at FROM public.user_roles WHERE user_id = $1',
        [userId]
      );
      return result;
    } catch (error) {
      AuthLogger.error('Database error fetching user roles', error, { userId });
      return [];
    }
  }

  /**
   * Get permissions for roles
   */
  static getPermissionsForRoles(roles) {
    const allPermissions = [
      'time_logging',
      'reports',
      'change_lead_reports',
      'resource_management',
      'project_management',
      'user_management',
      'system_admin',
      'dashboard',
      'calendar',
      'submission_overview',
      'settings',
      'role_management'
    ];

    // Admin gets all permissions
    if (roles.some(role => role.role === 'admin')) {
      return allPermissions;
    }

    // Regular users get basic permissions
    return [
      'time_logging',
      'reports',
      'dashboard',
      'calendar',
      'submission_overview'
    ];
  }

  /**
   * Generate JWT tokens
   */
  static generateTokens(user, roles, permissions, rememberMe) {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET not configured');
    }

    const tokenPayload = {
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resource_id
      }
    };

    const accessToken = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: rememberMe ? TOKEN_EXPIRY_LONG : TOKEN_EXPIRY_SHORT }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY_LONG }
    );

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(userId) {
    try {
      await DatabaseService.query(
        'UPDATE public.users SET last_login = NOW() WHERE id = $1',
        [userId]
      );
    } catch (error) {
      AuthLogger.error('Database error updating last login', error, { userId });
      // Don't throw - this is not critical for authentication
    }
  }

  /**
   * Get resource data for user
   */
  static async getResourceData(resourceId) {
    try {
      const result = await DatabaseService.query(
        'SELECT id, name, role FROM public.resources WHERE id = $1',
        [resourceId]
      );
      return result.length > 0 ? result[0] : { id: resourceId, name: 'Unknown User', role: 'User' };
    } catch (error) {
      AuthLogger.error('Database error fetching resource data', error, { resourceId });
      return { id: resourceId, name: 'Unknown User', role: 'User' };
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
      }
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      AuthLogger.warn('Token verification failed', { error: error.message });
      return null;
    }
  }

  /**
   * Hash password with bcrypt
   */
  static async hashPassword(password) {
    try {
      return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    } catch (error) {
      AuthLogger.error('Password hashing failed', error);
      throw error;
    }
  }

  /**
   * Get authentication statistics
   */
  static getAuthStats() {
    return {
      activeAttempts: loginAttempts.size,
      activeLockouts: accountLockouts.size,
      maxAttempts: MAX_LOGIN_ATTEMPTS,
      lockoutDuration: LOCKOUT_DURATION,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { AuthenticationService, AuthLogger };
