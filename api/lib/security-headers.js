// Security Headers and CORS Configuration Service
// Implements comprehensive security headers, CSP, and secure CORS configuration

// Security Headers Configuration
const SECURITY_HEADERS_CONFIG = {
  // Content Security Policy
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
    'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    'font-src': ["'self'", "https://fonts.gstatic.com"],
    'img-src': ["'self'", "data:", "https:"],
    'connect-src': ["'self'", "https://*.supabase.co"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': []
  },
  
  // CORS Configuration
  CORS: {
    // Allowed origins (configure based on environment)
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? [
          'https://your-production-domain.com',
          'https://www.your-production-domain.com'
        ]
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ],
    
    // Allowed methods
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    
    // Allowed headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name'
    ],
    
    // Exposed headers
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
    
    // Credentials
    credentials: true,
    
    // Preflight cache
    maxAge: 86400 // 24 hours
  },
  
  // Security Headers
  HEADERS: {
    // Prevent XSS attacks
    'X-XSS-Protection': '1; mode=block',
    
    // Prevent content type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    
    // HSTS (only in production with HTTPS)
    'Strict-Transport-Security': process.env.NODE_ENV === 'production' 
      ? 'max-age=31536000; includeSubDomains; preload'
      : null,
    
    // Cache control for sensitive endpoints
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    
    // Server identification
    'Server': 'ResourceFlow-API',
    
    // API version
    'X-API-Version': '1.0.0'
  }
};

class SecurityHeadersService {
  
  /**
   * Generate Content Security Policy header value
   */
  static generateCSP() {
    const cspDirectives = [];
    
    for (const [directive, sources] of Object.entries(SECURITY_HEADERS_CONFIG.CSP)) {
      if (sources.length === 0) {
        cspDirectives.push(directive);
      } else {
        cspDirectives.push(`${directive} ${sources.join(' ')}`);
      }
    }
    
    return cspDirectives.join('; ');
  }
  
  /**
   * Check if origin is allowed
   */
  static isOriginAllowed(origin) {
    if (!origin) return false;
    
    const allowedOrigins = SECURITY_HEADERS_CONFIG.CORS.allowedOrigins;
    
    // Check exact match
    if (allowedOrigins.includes(origin)) {
      return true;
    }
    
    // Check wildcard patterns (if any)
    return allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(origin);
      }
      return false;
    });
  }
  
  /**
   * Get CORS headers for a request
   */
  static getCORSHeaders(req) {
    const origin = req.headers.origin;
    const headers = {};
    
    // Check if origin is allowed
    if (this.isOriginAllowed(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else if (process.env.NODE_ENV === 'development') {
      // Allow all origins in development (with warning)
      headers['Access-Control-Allow-Origin'] = origin || '*';
      console.warn(`[SECURITY] Allowing origin in development: ${origin}`);
    }
    
    // Set other CORS headers
    headers['Access-Control-Allow-Methods'] = SECURITY_HEADERS_CONFIG.CORS.allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = SECURITY_HEADERS_CONFIG.CORS.allowedHeaders.join(', ');
    headers['Access-Control-Expose-Headers'] = SECURITY_HEADERS_CONFIG.CORS.exposedHeaders.join(', ');
    headers['Access-Control-Allow-Credentials'] = SECURITY_HEADERS_CONFIG.CORS.credentials.toString();
    headers['Access-Control-Max-Age'] = SECURITY_HEADERS_CONFIG.CORS.maxAge.toString();
    
    return headers;
  }
  
  /**
   * Get all security headers
   */
  static getSecurityHeaders(req = null) {
    const headers = { ...SECURITY_HEADERS_CONFIG.HEADERS };
    
    // Add CSP header
    headers['Content-Security-Policy'] = this.generateCSP();
    
    // Add CORS headers if request is provided
    if (req) {
      Object.assign(headers, this.getCORSHeaders(req));
    }
    
    // Remove null headers
    Object.keys(headers).forEach(key => {
      if (headers[key] === null || headers[key] === undefined) {
        delete headers[key];
      }
    });
    
    return headers;
  }
  
  /**
   * Apply security headers to response
   */
  static applyHeaders(res, req = null) {
    const headers = this.getSecurityHeaders(req);
    
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    
    return res;
  }
  
  /**
   * Handle preflight OPTIONS request
   */
  static handlePreflight(req, res) {
    const headers = this.getCORSHeaders(req);
    
    for (const [name, value] of Object.entries(headers)) {
      res.setHeader(name, value);
    }
    
    res.status(204).end();
  }
  
  /**
   * Security headers middleware
   */
  static middleware() {
    return (req, res, next) => {
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        this.handlePreflight(req, res);
        return;
      }
      
      // Apply security headers
      this.applyHeaders(res, req);
      
      next();
    };
  }
  
  /**
   * Validate security configuration
   */
  static validateConfiguration() {
    const errors = [];
    const warnings = [];
    
    // Check CORS configuration
    if (SECURITY_HEADERS_CONFIG.CORS.allowedOrigins.length === 0) {
      errors.push('No CORS origins configured');
    }
    
    if (process.env.NODE_ENV === 'production') {
      // Production-specific validations
      if (SECURITY_HEADERS_CONFIG.CORS.allowedOrigins.includes('*')) {
        errors.push('Wildcard CORS origin not allowed in production');
      }
      
      if (SECURITY_HEADERS_CONFIG.CORS.allowedOrigins.some(origin => origin.startsWith('http://'))) {
        warnings.push('HTTP origins detected in production - consider using HTTPS only');
      }
      
      if (!SECURITY_HEADERS_CONFIG.HEADERS['Strict-Transport-Security']) {
        warnings.push('HSTS header not configured for production');
      }
    }
    
    // Check CSP configuration
    if (SECURITY_HEADERS_CONFIG.CSP['script-src'].includes("'unsafe-eval'")) {
      warnings.push("CSP allows 'unsafe-eval' - consider removing for better security");
    }
    
    if (SECURITY_HEADERS_CONFIG.CSP['script-src'].includes("'unsafe-inline'")) {
      warnings.push("CSP allows 'unsafe-inline' scripts - consider using nonces or hashes");
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Get security configuration status
   */
  static getSecurityStatus() {
    const validation = this.validateConfiguration();
    
    return {
      environment: process.env.NODE_ENV || 'development',
      corsConfigured: SECURITY_HEADERS_CONFIG.CORS.allowedOrigins.length > 0,
      cspEnabled: true,
      hstsEnabled: !!SECURITY_HEADERS_CONFIG.HEADERS['Strict-Transport-Security'],
      validation,
      allowedOrigins: SECURITY_HEADERS_CONFIG.CORS.allowedOrigins,
      securityHeaders: Object.keys(SECURITY_HEADERS_CONFIG.HEADERS).filter(
        key => SECURITY_HEADERS_CONFIG.HEADERS[key] !== null
      )
    };
  }
  
  /**
   * Update CORS configuration dynamically
   */
  static updateCORSConfig(newConfig) {
    Object.assign(SECURITY_HEADERS_CONFIG.CORS, newConfig);
    
    // Validate new configuration
    const validation = this.validateConfiguration();
    if (!validation.valid) {
      console.warn('[SECURITY_HEADERS] Configuration validation warnings:', validation.warnings);
      if (validation.errors.length > 0) {
        console.error('[SECURITY_HEADERS] Configuration errors:', validation.errors);
      }
    }
  }
  
  /**
   * Initialize security headers service
   */
  static initialize() {
    console.log('[SECURITY_HEADERS] Initializing security headers service...');
    
    const status = this.getSecurityStatus();
    
    if (status.validation.warnings.length > 0) {
      console.warn('[SECURITY_HEADERS] Configuration warnings:');
      status.validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    if (status.validation.errors.length > 0) {
      console.error('[SECURITY_HEADERS] Configuration errors:');
      status.validation.errors.forEach(error => console.error(`  - ${error}`));
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid security headers configuration in production');
      }
    }
    
    console.log(`[SECURITY_HEADERS] Environment: ${status.environment}`);
    console.log(`[SECURITY_HEADERS] CORS Origins: ${status.allowedOrigins.length}`);
    console.log(`[SECURITY_HEADERS] Security Headers: ${status.securityHeaders.length}`);
    console.log(`[SECURITY_HEADERS] HSTS Enabled: ${status.hstsEnabled}`);
    
    return status;
  }
}

module.exports = {
  SecurityHeadersService,
  SECURITY_HEADERS_CONFIG
};
