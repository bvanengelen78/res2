const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Auth helper
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.user;
  } catch (error) {
    return null;
  }
}

// Login handler
async function handleLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // For testing - accept any email/password combination
    if (email && password) {
      const accessToken = jwt.sign(
        { user: { id: 1, email: email, resourceId: 1 } },
        JWT_SECRET,
        { expiresIn: rememberMe ? '30d' : '1d' }
      );

      const refreshToken = jwt.sign(
        { userId: 1 },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        user: {
          id: 1,
          email: email,
          resourceId: 1,
          roles: [{ role: 'admin' }],
          permissions: [
            'time_logging', 'reports', 'change_lead_reports', 'resource_management',
            'project_management', 'user_management', 'system_admin', 'dashboard',
            'calendar', 'submission_overview', 'settings', 'role_management'
          ],
          resource: { id: 1, name: 'Test User', role: 'Developer' }
        },
        tokens: { accessToken, refreshToken }
      });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed" });
  }
}

// User profile handler
async function handleMe(req, res) {
  try {
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resourceId,
        roles: [{ role: 'admin' }],
        permissions: [
          'time_logging', 'reports', 'change_lead_reports', 'resource_management',
          'project_management', 'user_management', 'system_admin', 'dashboard',
          'calendar', 'submission_overview', 'settings', 'role_management'
        ],
        resource: { id: user.resourceId, name: 'Test User', role: 'Developer' }
      }
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Authentication failed' });
  }
}

// Logout handler
async function handleLogout(req, res) {
  try {
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: "Logout failed" });
  }
}

// Refresh token handler
async function handleRefresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);

      const newAccessToken = jwt.sign(
        { user: { id: decoded.userId, email: 'test@example.com', resourceId: decoded.userId } },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      const newRefreshToken = jwt.sign(
        { userId: decoded.userId },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken }
      });
    } catch (error) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({ message: "Token refresh failed" });
  }
}

// Register handler
async function handleRegister(req, res) {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: "Email, password, and name are required" });
    }

    // Mock registration - always succeeds
    const accessToken = jwt.sign(
      { user: { id: 2, email: email, resourceId: 2 } },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: 2 },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      user: {
        id: 2,
        email: email,
        resourceId: 2,
        roles: [{ role: 'user' }],
        permissions: ['time_logging', 'dashboard'],
        resource: { id: 2, name: name, role: 'User' }
      },
      tokens: { accessToken, refreshToken }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: "Registration failed" });
  }
}

// Main handler with routing
module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    // Route based on pathname
    switch (pathname) {
      case '/api/login':
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        return await handleLogin(req, res);
        
      case '/api/me':
        if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
        return await handleMe(req, res);
        
      case '/api/logout':
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        return await handleLogout(req, res);
        
      case '/api/refresh':
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        return await handleRefresh(req, res);
        
      case '/api/register':
        if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
        return await handleRegister(req, res);
        
      default:
        return res.status(404).json({ message: 'Not found' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
