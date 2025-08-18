const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
    return res.status(405).json({ message: 'Method not allowed' });
  }

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
};
