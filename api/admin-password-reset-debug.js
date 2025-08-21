// Debug version of admin password reset endpoint
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Debug information
    const debugInfo = {
      success: true,
      message: 'Admin password reset debug endpoint',
      timestamp: new Date().toISOString(),
      method: req.method,
      query: req.query,
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        userAgent: req.headers['user-agent'] || 'Unknown'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    };

    // If it's a POST request, try to process it
    if (req.method === 'POST') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        debugInfo.authError = 'Authorization header missing or invalid format';
      } else {
        debugInfo.tokenPresent = true;
        debugInfo.tokenLength = authHeader.substring(7).length;
      }

      const { userId } = req.query;
      if (!userId) {
        debugInfo.userIdError = 'userId parameter missing';
      } else {
        debugInfo.userId = parseInt(userId);
        debugInfo.userIdValid = !isNaN(parseInt(userId));
      }
    }

    return res.status(200).json(debugInfo);

  } catch (error) {
    return res.status(500).json({
      error: true,
      message: 'Debug endpoint error',
      errorDetails: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
