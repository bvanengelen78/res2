const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

      const refreshToken = jwt.sign(
        { userId: 1 },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({
        user: {
          id: 1,
          email: email,
          resourceId: 1
        },
        tokens: {
          accessToken,
          refreshToken
        }
      });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: "Login failed" });
  }
};
