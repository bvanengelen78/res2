const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Simple auth handler for testing
async function handleAuth(req, res, path) {
  if (path === '/login' && req.method === 'POST') {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // For testing - accept any email/password combination
      // In production, this would check against Supabase
      if (email && password) {
        const accessToken = jwt.sign(
          { user: { id: 1, email: email, resourceId: 1 } },
          JWT_SECRET,
          { expiresIn: '1d' }
        );

        return res.json({
          user: {
            id: 1,
            email: email,
            resourceId: 1
          },
          tokens: {
            accessToken,
            refreshToken: accessToken
          }
        });
      } else {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: "Login failed" });
    }
  }

  if (path === '/me' && req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      return res.json({
        user: decoded.user
      });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }

  return res.status(404).json({ message: 'Auth endpoint not found' });
}

// Main handler
module.exports = async (req, res) => {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Health check
    if (pathname === '/api' || pathname === '/api/') {
      return res.json({
        status: 'healthy',
        message: 'ResourceFlow API is running!',
        timestamp: new Date().toISOString(),
        environment: {
          hasJwtSecret: !!process.env.JWT_SECRET,
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
    }

    // Auth endpoints
    if (pathname.startsWith('/api/auth')) {
      const authPath = pathname.replace('/api/auth', '');
      return await handleAuth(req, res, authPath);
    }

    // Dashboard endpoints
    if (pathname.startsWith('/api/dashboard')) {
      return res.json({
        message: 'Dashboard endpoints will be implemented here',
        endpoint: pathname
      });
    }

    // Resources endpoints
    if (pathname.startsWith('/api/resources')) {
      return res.json({
        message: 'Resources endpoints will be implemented here',
        endpoint: pathname
      });
    }

    // Projects endpoints
    if (pathname.startsWith('/api/projects')) {
      return res.json({
        message: 'Projects endpoints will be implemented here',
        endpoint: pathname
      });
    }

    // Default response
    return res.status(404).json({ 
      message: 'API endpoint not found',
      path: pathname,
      availableEndpoints: [
        '/api',
        '/api/auth/login',
        '/api/auth/me',
        '/api/dashboard/*',
        '/api/resources/*',
        '/api/projects/*'
      ]
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};
