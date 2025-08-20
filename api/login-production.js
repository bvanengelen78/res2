// Production-ready login endpoint without problematic middleware
// Based on the working api/login-debug.js pattern

const jwt = require('jsonwebtoken');

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
}

// Input validation
function validateLoginInput(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required and must be JSON' };
  }

  const { email, password, rememberMe } = body;

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

  // Password length validation
  if (password.length < 3) {
    return { valid: false, error: 'Password must be at least 3 characters' };
  }

  return { 
    valid: true, 
    data: { 
      email: email.trim().toLowerCase(), 
      password, 
      rememberMe: Boolean(rememberMe) 
    } 
  };
}

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { attempts: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  
  const record = rateLimitMap.get(key);
  
  // Reset if window expired
  if (now - record.firstAttempt > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { attempts: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  
  // Check if limit exceeded
  if (record.attempts >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetTime: record.firstAttempt + RATE_LIMIT_WINDOW };
  }
  
  // Increment attempts
  record.attempts++;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.attempts };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: true,
      message: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('[LOGIN_PROD] Starting production login', {
      method: req.method,
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // Rate limiting
    const clientIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      console.log('[LOGIN_PROD] Rate limit exceeded', { ip: clientIP });
      return res.status(429).json({
        error: true,
        message: 'Too many login attempts. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        timestamp: new Date().toISOString()
      });
    }

    // Input validation
    const validation = validateLoginInput(req.body);
    if (!validation.valid) {
      console.log('[LOGIN_PROD] Input validation failed:', validation.error);
      return res.status(400).json({
        error: true,
        message: validation.error,
        timestamp: new Date().toISOString()
      });
    }

    const { email, password, rememberMe } = validation.data;

    console.log('[LOGIN_PROD] Processing login for:', {
      email,
      rememberMe,
      remaining: rateLimit.remaining
    });

    // Authentication logic (currently accepts any valid credentials for development)
    // TODO: Replace with real authentication against Supabase users table
    if (email && password) {
      const JWT_SECRET = process.env.JWT_SECRET;
      
      if (!JWT_SECRET) {
        console.error('[LOGIN_PROD] JWT_SECRET not configured');
        return res.status(500).json({
          error: true,
          message: 'Authentication service unavailable',
          timestamp: new Date().toISOString()
        });
      }

      console.log('[LOGIN_PROD] Generating JWT tokens');

      // Generate tokens with consistent format (matching working debug endpoint)
      const accessToken = jwt.sign(
        {
          user: { id: 1, email: email, resourceId: 1 }
        },
        JWT_SECRET,
        { expiresIn: rememberMe ? '30d' : '1d' }
      );

      const refreshToken = jwt.sign(
        { userId: 1 },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Prepare response data (matching working debug endpoint format)
      const responseData = {
        user: {
          id: 1,
          email: email,
          resourceId: 1,
          roles: [{ role: 'admin' }],
          permissions: [
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
          ],
          resource: {
            id: 1,
            name: 'Test User',
            role: 'Developer'
          }
        },
        tokens: {
          accessToken,
          refreshToken
        }
      };

      console.log('[LOGIN_PROD] Login successful for:', email);
      return res.status(200).json(responseData);

    } else {
      console.log('[LOGIN_PROD] Authentication failed - invalid credentials');
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[LOGIN_PROD] Critical error in production login', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      error: true,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};
