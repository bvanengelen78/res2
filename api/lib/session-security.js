// Secure Session Management Service
// Implements token blacklisting, session invalidation, and secure session handling

const { nanoid } = require('nanoid');

// Session Security Configuration
const SESSION_CONFIG = {
  // Token blacklisting
  BLACKLIST_CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
  MAX_BLACKLIST_SIZE: 10000,
  
  // Session management
  MAX_CONCURRENT_SESSIONS: 5,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  IDLE_TIMEOUT: 2 * 60 * 60 * 1000, // 2 hours
  
  // Security settings
  REQUIRE_IP_VALIDATION: false, // Set to true for high-security environments
  REQUIRE_USER_AGENT_VALIDATION: false,
  SESSION_ROTATION_INTERVAL: 4 * 60 * 60 * 1000, // 4 hours
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS_PER_IP: 10,
  MAX_LOGIN_ATTEMPTS_PER_USER: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
};

// In-memory token blacklist (for production, use Redis or database)
const tokenBlacklist = new Map();
const sessionStore = new Map();
const loginAttempts = new Map();
const userLockouts = new Map();

// Cleanup interval for blacklisted tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of tokenBlacklist.entries()) {
    if (now > expiry) {
      tokenBlacklist.delete(token);
    }
  }
  
  // Limit blacklist size
  if (tokenBlacklist.size > SESSION_CONFIG.MAX_BLACKLIST_SIZE) {
    const entries = Array.from(tokenBlacklist.entries());
    entries.sort((a, b) => a[1] - b[1]); // Sort by expiry time
    const toDelete = entries.slice(0, entries.length - SESSION_CONFIG.MAX_BLACKLIST_SIZE);
    toDelete.forEach(([token]) => tokenBlacklist.delete(token));
  }
}, SESSION_CONFIG.BLACKLIST_CLEANUP_INTERVAL);

class SessionSecurityService {
  
  /**
   * Create a new secure session
   */
  static createSession(userId, userAgent, ipAddress, rememberMe = false) {
    const sessionId = nanoid(32);
    const now = Date.now();
    const expiresAt = now + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : SESSION_CONFIG.SESSION_TIMEOUT);
    
    const session = {
      id: sessionId,
      userId,
      userAgent,
      ipAddress,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      isActive: true,
      rememberMe,
      rotationCount: 0
    };
    
    sessionStore.set(sessionId, session);
    
    // Clean up old sessions for this user
    this.cleanupUserSessions(userId);
    
    return session;
  }
  
  /**
   * Validate and update session
   */
  static validateSession(sessionId, userAgent, ipAddress) {
    const session = sessionStore.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }
    
    if (!session.isActive) {
      return { valid: false, reason: 'Session inactive' };
    }
    
    const now = Date.now();
    
    // Check expiry
    if (now > session.expiresAt) {
      this.invalidateSession(sessionId);
      return { valid: false, reason: 'Session expired' };
    }
    
    // Check idle timeout
    if (now - session.lastAccessedAt > SESSION_CONFIG.IDLE_TIMEOUT) {
      this.invalidateSession(sessionId);
      return { valid: false, reason: 'Session idle timeout' };
    }
    
    // Validate IP address if required
    if (SESSION_CONFIG.REQUIRE_IP_VALIDATION && session.ipAddress !== ipAddress) {
      this.invalidateSession(sessionId);
      return { valid: false, reason: 'IP address mismatch' };
    }
    
    // Validate user agent if required
    if (SESSION_CONFIG.REQUIRE_USER_AGENT_VALIDATION && session.userAgent !== userAgent) {
      this.invalidateSession(sessionId);
      return { valid: false, reason: 'User agent mismatch' };
    }
    
    // Update last accessed time
    session.lastAccessedAt = now;
    sessionStore.set(sessionId, session);
    
    // Check if session needs rotation
    if (now - session.createdAt > SESSION_CONFIG.SESSION_ROTATION_INTERVAL) {
      return { valid: true, session, needsRotation: true };
    }
    
    return { valid: true, session };
  }
  
  /**
   * Invalidate a specific session
   */
  static invalidateSession(sessionId) {
    const session = sessionStore.get(sessionId);
    if (session) {
      session.isActive = false;
      sessionStore.set(sessionId, session);
    }
    return true;
  }
  
  /**
   * Invalidate all sessions for a user
   */
  static invalidateUserSessions(userId) {
    let invalidatedCount = 0;
    for (const [sessionId, session] of sessionStore.entries()) {
      if (session.userId === userId && session.isActive) {
        session.isActive = false;
        sessionStore.set(sessionId, session);
        invalidatedCount++;
      }
    }
    return invalidatedCount;
  }
  
  /**
   * Clean up old sessions for a user (keep only recent ones)
   */
  static cleanupUserSessions(userId) {
    const userSessions = Array.from(sessionStore.entries())
      .filter(([_, session]) => session.userId === userId && session.isActive)
      .sort((a, b) => b[1].lastAccessedAt - a[1].lastAccessedAt);
    
    // Keep only the most recent sessions
    if (userSessions.length > SESSION_CONFIG.MAX_CONCURRENT_SESSIONS) {
      const sessionsToRemove = userSessions.slice(SESSION_CONFIG.MAX_CONCURRENT_SESSIONS);
      sessionsToRemove.forEach(([sessionId]) => {
        this.invalidateSession(sessionId);
      });
    }
  }
  
  /**
   * Blacklist a token
   */
  static blacklistToken(token, expiryTime) {
    tokenBlacklist.set(token, expiryTime);
  }
  
  /**
   * Check if token is blacklisted
   */
  static isTokenBlacklisted(token) {
    if (!tokenBlacklist.has(token)) {
      return false;
    }
    
    const expiry = tokenBlacklist.get(token);
    if (Date.now() > expiry) {
      tokenBlacklist.delete(token);
      return false;
    }
    
    return true;
  }
  
  /**
   * Record failed login attempt
   */
  static recordFailedAttempt(identifier, type = 'user') {
    const key = `${type}:${identifier}`;
    const attempts = loginAttempts.get(key) || [];
    const now = Date.now();
    
    // Remove attempts older than lockout duration
    const recentAttempts = attempts.filter(time => now - time < SESSION_CONFIG.LOCKOUT_DURATION);
    recentAttempts.push(now);
    
    loginAttempts.set(key, recentAttempts);
    
    // Check if lockout is needed
    const maxAttempts = type === 'ip' ? SESSION_CONFIG.MAX_LOGIN_ATTEMPTS_PER_IP : SESSION_CONFIG.MAX_LOGIN_ATTEMPTS_PER_USER;
    if (recentAttempts.length >= maxAttempts) {
      userLockouts.set(key, now + SESSION_CONFIG.LOCKOUT_DURATION);
      return { locked: true, lockoutUntil: now + SESSION_CONFIG.LOCKOUT_DURATION };
    }
    
    return { locked: false, attempts: recentAttempts.length };
  }
  
  /**
   * Check if user/IP is locked out
   */
  static isLockedOut(identifier, type = 'user') {
    const key = `${type}:${identifier}`;
    const lockoutUntil = userLockouts.get(key);
    
    if (!lockoutUntil) {
      return { locked: false };
    }
    
    if (Date.now() > lockoutUntil) {
      userLockouts.delete(key);
      loginAttempts.delete(key);
      return { locked: false };
    }
    
    return { locked: true, lockoutUntil };
  }
  
  /**
   * Clear failed attempts for user/IP
   */
  static clearFailedAttempts(identifier, type = 'user') {
    const key = `${type}:${identifier}`;
    loginAttempts.delete(key);
    userLockouts.delete(key);
  }
  
  /**
   * Get session statistics
   */
  static getSessionStats() {
    const now = Date.now();
    const activeSessions = Array.from(sessionStore.values()).filter(s => s.isActive && now < s.expiresAt);
    
    return {
      totalSessions: sessionStore.size,
      activeSessions: activeSessions.length,
      blacklistedTokens: tokenBlacklist.size,
      activeLoginAttempts: loginAttempts.size,
      activeLockouts: userLockouts.size,
      config: SESSION_CONFIG
    };
  }
  
  /**
   * Extract session ID from JWT token
   */
  static extractSessionIdFromToken(decodedToken) {
    return decodedToken.sessionId || decodedToken.jti || null;
  }
}

module.exports = {
  SessionSecurityService,
  SESSION_CONFIG
};
