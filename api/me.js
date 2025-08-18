const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Auth helper
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

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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
};
