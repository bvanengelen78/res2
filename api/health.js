module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Check environment variables (without exposing sensitive values)
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      vercelRegion: process.env.VERCEL_REGION || 'not set',
      vercelUrl: process.env.VERCEL_URL || 'not set'
    };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      environment: envCheck,
      message: 'Serverless function is working correctly!'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
