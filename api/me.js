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
};
