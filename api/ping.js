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

  // Handle password reset requests
  if (req.query.action === 'reset-password' && req.method === 'POST') {
    try {
      // For now, return a mock response to test the endpoint
      return res.status(200).json({
        success: true,
        message: 'Password reset endpoint is working',
        password: 'TestPassword123',
        user: {
          id: parseInt(req.query.userId) || 0,
          email: 'test@example.com',
          name: 'Test User'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Password reset error:', error);
      return res.status(500).json({
        error: true,
        message: 'Password reset failed',
        debug: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    res.json({
      message: "pong",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    });
  } catch (error) {
    console.error('Ping error:', error);
    res.status(500).json({ message: 'Ping failed' });
  }
};
