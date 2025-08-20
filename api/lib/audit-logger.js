// Comprehensive Audit Logging System
// Enterprise-grade security event logging with structured data and correlation

const { DatabaseService } = require('./supabase');

// Audit event types
const AUDIT_EVENTS = {
  // Authentication events
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  TOKEN_REFRESH: 'token_refresh',
  TOKEN_REVOKED: 'token_revoked',
  
  // Account management
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_UPDATED: 'account_updated',
  ACCOUNT_DISABLED: 'account_disabled',
  ACCOUNT_ENABLED: 'account_enabled',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  
  // Password events
  PASSWORD_CHANGED: 'password_changed',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_COMPLETED: 'password_reset_completed',
  
  // Security events
  BRUTE_FORCE_DETECTED: 'brute_force_detected',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  SECURITY_VIOLATION: 'security_violation',
  
  // System events
  SYSTEM_ERROR: 'system_error',
  CONFIGURATION_CHANGED: 'configuration_changed'
};

// Risk levels
const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class AuditLogger {
  
  /**
   * Log authentication event
   */
  static async logAuthEvent(eventType, context = {}) {
    const auditEntry = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      user_id: context.userId || null,
      email: context.email || null,
      client_ip: context.clientIP || null,
      user_agent: context.userAgent || null,
      session_id: context.sessionId || null,
      request_id: context.requestId || null,
      risk_level: this.calculateRiskLevel(eventType, context),
      details: {
        ...context,
        // Remove sensitive data
        password: undefined,
        token: undefined
      },
      created_at: new Date()
    };

    try {
      // Log to console for immediate visibility
      console.log(JSON.stringify({
        level: 'audit',
        ...auditEntry
      }));

      // Store in database for long-term analysis
      await this.storeAuditEntry(auditEntry);

      // Check for security patterns
      await this.analyzeSecurityPatterns(auditEntry);

    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit logging failure shouldn't break authentication
    }
  }

  /**
   * Calculate risk level based on event type and context
   */
  static calculateRiskLevel(eventType, context) {
    // Critical events
    if ([
      AUDIT_EVENTS.BRUTE_FORCE_DETECTED,
      AUDIT_EVENTS.SECURITY_VIOLATION,
      AUDIT_EVENTS.ACCOUNT_LOCKED
    ].includes(eventType)) {
      return RISK_LEVELS.CRITICAL;
    }

    // High risk events
    if ([
      AUDIT_EVENTS.LOGIN_FAILURE,
      AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
      AUDIT_EVENTS.PASSWORD_RESET_REQUESTED
    ].includes(eventType)) {
      return RISK_LEVELS.HIGH;
    }

    // Medium risk events
    if ([
      AUDIT_EVENTS.LOGIN_SUCCESS,
      AUDIT_EVENTS.PASSWORD_CHANGED,
      AUDIT_EVENTS.ACCOUNT_UPDATED
    ].includes(eventType)) {
      return RISK_LEVELS.MEDIUM;
    }

    // Low risk events
    return RISK_LEVELS.LOW;
  }

  /**
   * Store audit entry in database
   */
  static async storeAuditEntry(auditEntry) {
    try {
      // Check if audit table exists, create if not
      await this.ensureAuditTable();

      const query = `
        INSERT INTO public.audit_logs (
          event_type, timestamp, user_id, email, client_ip, user_agent,
          session_id, request_id, risk_level, details, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      const values = [
        auditEntry.event_type,
        auditEntry.timestamp,
        auditEntry.user_id,
        auditEntry.email,
        auditEntry.client_ip,
        auditEntry.user_agent,
        auditEntry.session_id,
        auditEntry.request_id,
        auditEntry.risk_level,
        JSON.stringify(auditEntry.details),
        auditEntry.created_at
      ];

      await DatabaseService.query(query, values);

    } catch (error) {
      console.error('Failed to store audit entry:', error);
      // Continue without throwing to avoid breaking authentication
    }
  }

  /**
   * Ensure audit table exists
   */
  static async ensureAuditTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.audit_logs (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(100) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          user_id INTEGER,
          email VARCHAR(255),
          client_ip INET,
          user_agent TEXT,
          session_id VARCHAR(255),
          request_id VARCHAR(255),
          risk_level VARCHAR(20) NOT NULL,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          
          -- Indexes for performance
          INDEX idx_audit_logs_timestamp (timestamp),
          INDEX idx_audit_logs_user_id (user_id),
          INDEX idx_audit_logs_email (email),
          INDEX idx_audit_logs_client_ip (client_ip),
          INDEX idx_audit_logs_event_type (event_type),
          INDEX idx_audit_logs_risk_level (risk_level)
        );
      `;

      await DatabaseService.query(createTableQuery);

    } catch (error) {
      // Table might already exist, or we might not have permissions
      console.warn('Could not ensure audit table exists:', error.message);
    }
  }

  /**
   * Analyze security patterns
   */
  static async analyzeSecurityPatterns(auditEntry) {
    try {
      // Check for brute force patterns
      if (auditEntry.event_type === AUDIT_EVENTS.LOGIN_FAILURE) {
        await this.checkBruteForcePattern(auditEntry);
      }

      // Check for suspicious IP activity
      if (auditEntry.client_ip) {
        await this.checkSuspiciousIPActivity(auditEntry);
      }

      // Check for unusual login patterns
      if (auditEntry.event_type === AUDIT_EVENTS.LOGIN_SUCCESS) {
        await this.checkUnusualLoginPatterns(auditEntry);
      }

    } catch (error) {
      console.error('Security pattern analysis failed:', error);
    }
  }

  /**
   * Check for brute force attack patterns
   */
  static async checkBruteForcePattern(auditEntry) {
    try {
      const timeWindow = 15 * 60 * 1000; // 15 minutes
      const threshold = 10; // 10 failed attempts
      const now = new Date();
      const windowStart = new Date(now.getTime() - timeWindow);

      const query = `
        SELECT COUNT(*) as failure_count
        FROM public.audit_logs
        WHERE event_type = $1
          AND (client_ip = $2 OR email = $3)
          AND timestamp >= $4
      `;

      const result = await DatabaseService.query(query, [
        AUDIT_EVENTS.LOGIN_FAILURE,
        auditEntry.client_ip,
        auditEntry.email,
        windowStart.toISOString()
      ]);

      const failureCount = parseInt(result[0]?.failure_count || 0);

      if (failureCount >= threshold) {
        await this.logAuthEvent(AUDIT_EVENTS.BRUTE_FORCE_DETECTED, {
          ...auditEntry.details,
          failureCount,
          timeWindow: timeWindow / 1000,
          threshold
        });
      }

    } catch (error) {
      console.error('Brute force pattern check failed:', error);
    }
  }

  /**
   * Check for suspicious IP activity
   */
  static async checkSuspiciousIPActivity(auditEntry) {
    try {
      const timeWindow = 60 * 60 * 1000; // 1 hour
      const threshold = 5; // 5 different users from same IP
      const now = new Date();
      const windowStart = new Date(now.getTime() - timeWindow);

      const query = `
        SELECT COUNT(DISTINCT email) as unique_users
        FROM public.audit_logs
        WHERE client_ip = $1
          AND timestamp >= $2
          AND email IS NOT NULL
      `;

      const result = await DatabaseService.query(query, [
        auditEntry.client_ip,
        windowStart.toISOString()
      ]);

      const uniqueUsers = parseInt(result[0]?.unique_users || 0);

      if (uniqueUsers >= threshold) {
        await this.logAuthEvent(AUDIT_EVENTS.SUSPICIOUS_ACTIVITY, {
          ...auditEntry.details,
          suspiciousPattern: 'multiple_users_same_ip',
          uniqueUsers,
          timeWindow: timeWindow / 1000,
          threshold
        });
      }

    } catch (error) {
      console.error('Suspicious IP activity check failed:', error);
    }
  }

  /**
   * Check for unusual login patterns
   */
  static async checkUnusualLoginPatterns(auditEntry) {
    try {
      if (!auditEntry.user_id) return;

      // Check for login from new location/device
      const query = `
        SELECT DISTINCT client_ip, user_agent
        FROM public.audit_logs
        WHERE user_id = $1
          AND event_type = $2
          AND timestamp >= NOW() - INTERVAL '30 days'
        ORDER BY timestamp DESC
        LIMIT 10
      `;

      const result = await DatabaseService.query(query, [
        auditEntry.user_id,
        AUDIT_EVENTS.LOGIN_SUCCESS
      ]);

      const isNewIP = !result.some(row => row.client_ip === auditEntry.client_ip);
      const isNewUserAgent = !result.some(row => row.user_agent === auditEntry.user_agent);

      if (isNewIP || isNewUserAgent) {
        await this.logAuthEvent(AUDIT_EVENTS.SUSPICIOUS_ACTIVITY, {
          ...auditEntry.details,
          suspiciousPattern: 'new_device_or_location',
          isNewIP,
          isNewUserAgent
        });
      }

    } catch (error) {
      console.error('Unusual login pattern check failed:', error);
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(timeWindow = 24 * 60 * 60 * 1000) {
    try {
      const windowStart = new Date(Date.now() - timeWindow);

      const query = `
        SELECT 
          event_type,
          risk_level,
          COUNT(*) as count
        FROM public.audit_logs
        WHERE timestamp >= $1
        GROUP BY event_type, risk_level
        ORDER BY count DESC
      `;

      const result = await DatabaseService.query(query, [windowStart.toISOString()]);
      return result;

    } catch (error) {
      console.error('Failed to get audit stats:', error);
      return [];
    }
  }
}

module.exports = { AuditLogger, AUDIT_EVENTS, RISK_LEVELS };
