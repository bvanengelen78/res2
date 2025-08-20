// Simplified login function without database dependencies
// This eliminates circular dependency issues and focuses on core authentication

const jwt = require('jsonwebtoken');

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Simple input validation
function validateLoginInput(body) {
  if (!body) {
    return { valid: false, error: 'Request body is required' };
  }

  const { email, password, rememberMe } = body;

  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Valid email is required' };
  }

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Valid password is required' };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return {
    valid: true,
    data: {
      email,
      password,
      rememberMe: Boolean(rememberMe)
    }
  };
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: true,
      message: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    console.log('[LOGIN_SIMPLE] Starting simplified login', {
      method: req.method,
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV
    });

    // Validate input
    const validation = validateLoginInput(req.body);
    if (!validation.valid) {
      console.log('[LOGIN_SIMPLE] Input validation failed:', validation.error);
      return res.status(400).json({
        error: true,
        message: validation.error,
        timestamp: new Date().toISOString()
      });
    }

    const { email, password, rememberMe } = validation.data;

    console.log('[LOGIN_SIMPLE] Processing login for:', {
      email,
      rememberMe,
      hasPassword: !!password
    });

    // Simple authentication (accept any valid email/password for development)
    if (email && password) {
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

      console.log('[LOGIN_SIMPLE] JWT configuration:', {
        hasJwtSecret: !!process.env.JWT_SECRET,
        jwtSecretLength: JWT_SECRET.length,
        jwtSecretSource: process.env.JWT_SECRET ? 'environment' : 'default'
      });

      // Generate tokens with consistent format
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

      console.log('[LOGIN_SIMPLE] Tokens generated successfully:', {
        accessTokenLength: accessToken.length,
        refreshTokenLength: refreshToken.length
      });

      // Prepare response data
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

      console.log('[LOGIN_SIMPLE] Login successful for:', email);
      return res.status(200).json(responseData);

    } else {
      console.log('[LOGIN_SIMPLE] Authentication failed - invalid credentials');
      return res.status(401).json({
        error: true,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString()
      });
    }

    console.error('[LOGIN_SIMPLE] Critical error in simplified login', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    try {
      return res.status(500).json({
        error: true,
        message: `Login failed: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    } catch (responseError) {
      console.error('[LOGIN_SIMPLE] Failed to send error response', responseError);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Login failed: ${error.message}`);
    }
  }
};
