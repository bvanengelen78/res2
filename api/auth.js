const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Auth helpers
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.user;
  } catch (error) {
    return null;
  }
}

// Route handlers
async function handleLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // For testing - accept any email/password combination
    // In production, this would check against Supabase
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
          resource: {
            id: 1,
            name: 'Test User',
            role: 'Developer'
          }
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed" });
  }
}

async function handleRegister(req, res) {
  try {
    const { email, password, resourceId } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // For testing - accept any registration
    const accessToken = jwt.sign(
      { user: { id: 2, email: email, resourceId: resourceId || 2 } },
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
        resourceId: resourceId || 2,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: "Registration failed" });
  }
}

async function handleMe(req, res) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = verifyToken(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        resourceId: user.resourceId,
        resource: {
          id: user.resourceId,
          name: 'Test User',
          role: 'Developer'
        }
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

async function handleRefresh(req, res) {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const userId = decoded.userId;

    const accessToken = jwt.sign(
      { user: { id: userId, email: 'test@example.com', resourceId: userId } },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      tokens: {
        accessToken,
        refreshToken, // Keep the same refresh token
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: "Token refresh failed" });
  }
}

async function handleLogout(req, res) {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const path = pathname.replace('/api/auth', '');
  const route = `${req.method}:${path}`;

  try {
    switch (route) {
      case 'POST:/login':
        return await handleLogin(req, res);
      case 'POST:/register':
        return await handleRegister(req, res);
      case 'GET:/me':
        return await handleMe(req, res);
      case 'POST:/refresh':
        return await handleRefresh(req, res);
      case 'POST:/logout':
        return await handleLogout(req, res);
      case 'GET:':
      case 'GET:/':
        return res.json({
          message: 'Authentication API',
          endpoints: ['/login', '/register', '/me', '/refresh', '/logout'],
          methods: {
            '/login': 'POST',
            '/register': 'POST', 
            '/me': 'GET',
            '/refresh': 'POST',
            '/logout': 'POST'
          }
        });
      default:
        return res.status(404).json({ message: 'Auth endpoint not found' });
    }
  } catch (error) {
    console.error('Auth API error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
