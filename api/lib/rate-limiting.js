// Comprehensive Rate Limiting and Brute Force Protection Service
// Implements multiple layers of rate limiting and attack prevention

// Rate Limiting Configuration
const RATE_LIMIT_CONFIG = {
  // General API rate limiting
  GENERAL_API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'Too many requests from this IP'
  },
  
  // Authentication endpoints
  AUTH_LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many login attempts'
  },
  
  AUTH_REGISTER: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    message: 'Too many registration attempts'
  },
  
  AUTH_PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts'
  },
  
  // Progressive penalties
  PROGRESSIVE_PENALTIES: {
    enabled: true,
    baseDelay: 1000, // 1 second
    maxDelay: 300000, // 5 minutes
    multiplier: 2
  },
  
  // Brute force protection
  BRUTE_FORCE: {
    maxFailedAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    progressiveLockout: true,
    maxLockoutDuration: 24 * 60 * 60 * 1000 // 24 hours
  },
  
  // Suspicious activity detection
  SUSPICIOUS_ACTIVITY: {
    rapidRequestThreshold: 100, // requests per minute
    distributedAttackThreshold: 50, // requests from different IPs to same endpoint
    patternDetection: true
  }
};

// In-memory storage (for production, use Redis or database)
const rateLimitStore = new Map();
const bruteForceStore = new Map();
const suspiciousActivityStore = new Map();
const progressivePenalties = new Map();

// Cleanup intervals
setInterval(() => {
  const now = Date.now();
  
  // Clean up expired rate limit entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  
  // Clean up expired brute force entries
  for (const [key, data] of bruteForceStore.entries()) {
    if (now > data.lockoutUntil) {
      bruteForceStore.delete(key);
    }
  }
  
  // Clean up expired progressive penalties
  for (const [key, data] of progressivePenalties.entries()) {
    if (now > data.resetTime) {
      progressivePenalties.delete(key);
    }
  }
}, 60000); // Clean up every minute

class RateLimitingService {
  
  /**
   * Check rate limit for a specific endpoint and identifier
   */
  static checkRateLimit(identifier, endpoint, config = RATE_LIMIT_CONFIG.GENERAL_API) {
    const key = `${endpoint}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    let data = rateLimitStore.get(key);
    
    if (!data || now > data.resetTime) {
      // Initialize or reset window
      data = {
        count: 0,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
    }
    
    // Filter out old requests
    data.requests = (data.requests || []).filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (data.requests.length >= config.maxRequests) {
      // Apply progressive penalty if enabled
      if (RATE_LIMIT_CONFIG.PROGRESSIVE_PENALTIES.enabled) {
        this.applyProgressivePenalty(identifier, endpoint);
      }
      
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: data.resetTime,
        retryAfter: Math.ceil((data.resetTime - now) / 1000),
        message: config.message
      };
    }
    
    // Add current request
    data.requests.push(now);
    data.count = data.requests.length;
    rateLimitStore.set(key, data);
    
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - data.count,
      resetTime: data.resetTime,
      retryAfter: 0
    };
  }
  
  /**
   * Apply progressive penalty for repeated violations
   */
  static applyProgressivePenalty(identifier, endpoint) {
    const key = `penalty:${endpoint}:${identifier}`;
    const now = Date.now();
    
    let penalty = progressivePenalties.get(key);
    
    if (!penalty || now > penalty.resetTime) {
      penalty = {
        violations: 0,
        currentDelay: RATE_LIMIT_CONFIG.PROGRESSIVE_PENALTIES.baseDelay,
        resetTime: now + (24 * 60 * 60 * 1000) // Reset after 24 hours
      };
    }
    
    penalty.violations++;
    penalty.currentDelay = Math.min(
      penalty.currentDelay * RATE_LIMIT_CONFIG.PROGRESSIVE_PENALTIES.multiplier,
      RATE_LIMIT_CONFIG.PROGRESSIVE_PENALTIES.maxDelay
    );
    
    progressivePenalties.set(key, penalty);
    
    return penalty.currentDelay;
  }
  
  /**
   * Check for brute force attacks
   */
  static checkBruteForce(identifier, type = 'user') {
    const key = `brute:${type}:${identifier}`;
    const now = Date.now();
    
    let data = bruteForceStore.get(key);
    
    if (!data) {
      data = {
        attempts: 0,
        lockoutUntil: 0,
        lockoutCount: 0
      };
    }
    
    // Check if currently locked out
    if (now < data.lockoutUntil) {
      return {
        locked: true,
        lockoutUntil: data.lockoutUntil,
        retryAfter: Math.ceil((data.lockoutUntil - now) / 1000),
        attempts: data.attempts
      };
    }
    
    return {
      locked: false,
      attempts: data.attempts,
      remaining: RATE_LIMIT_CONFIG.BRUTE_FORCE.maxFailedAttempts - data.attempts
    };
  }
  
  /**
   * Record failed authentication attempt
   */
  static recordFailedAttempt(identifier, type = 'user') {
    const key = `brute:${type}:${identifier}`;
    const now = Date.now();
    
    let data = bruteForceStore.get(key) || {
      attempts: 0,
      lockoutUntil: 0,
      lockoutCount: 0
    };
    
    data.attempts++;
    
    // Check if lockout threshold reached
    if (data.attempts >= RATE_LIMIT_CONFIG.BRUTE_FORCE.maxFailedAttempts) {
      data.lockoutCount++;
      
      // Progressive lockout duration
      let lockoutDuration = RATE_LIMIT_CONFIG.BRUTE_FORCE.lockoutDuration;
      if (RATE_LIMIT_CONFIG.BRUTE_FORCE.progressiveLockout) {
        lockoutDuration = Math.min(
          lockoutDuration * Math.pow(2, data.lockoutCount - 1),
          RATE_LIMIT_CONFIG.BRUTE_FORCE.maxLockoutDuration
        );
      }
      
      data.lockoutUntil = now + lockoutDuration;
      data.attempts = 0; // Reset attempts after lockout
    }
    
    bruteForceStore.set(key, data);
    
    return {
      locked: now < data.lockoutUntil,
      lockoutUntil: data.lockoutUntil,
      attempts: data.attempts,
      lockoutCount: data.lockoutCount
    };
  }
  
  /**
   * Clear failed attempts (on successful authentication)
   */
  static clearFailedAttempts(identifier, type = 'user') {
    const key = `brute:${type}:${identifier}`;
    bruteForceStore.delete(key);
  }
  
  /**
   * Detect suspicious activity patterns
   */
  static detectSuspiciousActivity(endpoint, identifier, userAgent, additionalData = {}) {
    const now = Date.now();
    const windowStart = now - (60 * 1000); // 1 minute window
    
    // Track requests per endpoint
    const endpointKey = `suspicious:endpoint:${endpoint}`;
    let endpointData = suspiciousActivityStore.get(endpointKey) || { requests: [] };
    endpointData.requests = endpointData.requests.filter(req => req.time > windowStart);
    endpointData.requests.push({ time: now, identifier, userAgent, ...additionalData });
    suspiciousActivityStore.set(endpointKey, endpointData);
    
    // Check for rapid requests
    const rapidRequests = endpointData.requests.length > RATE_LIMIT_CONFIG.SUSPICIOUS_ACTIVITY.rapidRequestThreshold;
    
    // Check for distributed attack (many different IPs)
    const uniqueIdentifiers = new Set(endpointData.requests.map(req => req.identifier));
    const distributedAttack = uniqueIdentifiers.size > RATE_LIMIT_CONFIG.SUSPICIOUS_ACTIVITY.distributedAttackThreshold;
    
    // Check for pattern-based attacks
    const patternAttack = this.detectPatternAttack(endpointData.requests);
    
    const suspicious = rapidRequests || distributedAttack || patternAttack;
    
    if (suspicious) {
      return {
        suspicious: true,
        reasons: {
          rapidRequests,
          distributedAttack,
          patternAttack
        },
        requestCount: endpointData.requests.length,
        uniqueIdentifiers: uniqueIdentifiers.size
      };
    }
    
    return { suspicious: false };
  }
  
  /**
   * Detect pattern-based attacks
   */
  static detectPatternAttack(requests) {
    if (requests.length < 10) return false;
    
    // Check for identical user agents (bot-like behavior)
    const userAgents = requests.map(req => req.userAgent);
    const uniqueUserAgents = new Set(userAgents);
    const identicalUserAgents = uniqueUserAgents.size === 1 && requests.length > 20;
    
    // Check for sequential timing patterns
    const timings = requests.map(req => req.time).sort();
    const intervals = [];
    for (let i = 1; i < timings.length; i++) {
      intervals.push(timings[i] - timings[i-1]);
    }
    
    // Check if intervals are suspiciously regular (automated)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const regularIntervals = intervals.every(interval => Math.abs(interval - avgInterval) < 100);
    
    return identicalUserAgents || (regularIntervals && avgInterval < 1000);
  }
  
  /**
   * Get rate limiting middleware
   */
  static middleware(endpoint, config) {
    return (req, res, next) => {
      const identifier = req.ip || req.connection.remoteAddress || 'unknown';
      const result = this.checkRateLimit(identifier, endpoint, config);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': result.limit,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString()
      });
      
      if (!result.allowed) {
        res.set('Retry-After', result.retryAfter);
        return res.status(429).json({
          error: true,
          message: result.message,
          code: 'RATE_LIMITED',
          retryAfter: result.retryAfter,
          timestamp: new Date().toISOString()
        });
      }
      
      next();
    };
  }
  
  /**
   * Get rate limiting statistics
   */
  static getStats() {
    return {
      rateLimitEntries: rateLimitStore.size,
      bruteForceEntries: bruteForceStore.size,
      suspiciousActivityEntries: suspiciousActivityStore.size,
      progressivePenalties: progressivePenalties.size,
      config: RATE_LIMIT_CONFIG
    };
  }
}

module.exports = {
  RateLimitingService,
  RATE_LIMIT_CONFIG
};
