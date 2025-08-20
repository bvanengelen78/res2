// Simplified login function for debugging production issues
// This bypasses the complex middleware to isolate the root cause

const jwt = require('jsonwebtoken');

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    console.log('[LOGIN_DEBUG] Starting simplified login debug', {
      method: req.method,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      contentType: req.headers['content-type'],
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET
    });

    // Basic request validation
    if (!req.body) {
      console.log('[LOGIN_DEBUG] No request body found');
      return res.status(400).json({
        error: true,
        message: 'Request body is required',
        timestamp: new Date().toISOString()
      });
    }

    const { email, password, rememberMe } = req.body;
    
    console.log('[LOGIN_DEBUG] Extracted credentials', {
      email,
      hasPassword: !!password,
      passwordLength: password ? password.length : 0,
      rememberMe,
      emailType: typeof email,
      passwordType: typeof password
    });

    // Basic validation
    if (!email || !password) {
      console.log('[LOGIN_DEBUG] Missing email or password');
      return res.status(400).json({
        error: true,
        message: 'Email and password are required',
        timestamp: new Date().toISOString()
      });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      console.log('[LOGIN_DEBUG] Invalid email or password type');
      return res.status(400).json({
        error: true,
        message: 'Email and password must be strings',
        timestamp: new Date().toISOString()
      });
    }

    // JWT Secret validation
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    console.log('[LOGIN_DEBUG] JWT configuration', {
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: JWT_SECRET.length,
      jwtSecretSource: process.env.JWT_SECRET ? 'environment' : 'default'
    });

    // Token generation test
    console.log('[LOGIN_DEBUG] Attempting token generation');
    
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

    console.log('[LOGIN_DEBUG] Tokens generated successfully', {
      accessTokenLength: accessToken.length,
      refreshTokenLength: refreshToken.length,
      accessTokenPreview: accessToken.substring(0, 50) + '...',
      refreshTokenPreview: refreshToken.substring(0, 50) + '...'
    });

    // Response data preparation
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

    console.log('[LOGIN_DEBUG] Response data prepared', {
      hasUser: !!responseData.user,
      hasTokens: !!responseData.tokens,
      userEmail: responseData.user.email,
      userRoles: responseData.user.roles.map(r => r.role),
      permissionsCount: responseData.user.permissions.length
    });

    console.log('[LOGIN_DEBUG] Sending successful response');
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('[LOGIN_DEBUG] Critical error in simplified login', {
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
      console.error('[LOGIN_DEBUG] Failed to send error response', responseError);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Login failed: ${error.message}`);
    }
  }
};
