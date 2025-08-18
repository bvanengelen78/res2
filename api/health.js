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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check environment variables (without exposing sensitive values)
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      vercelRegion: process.env.VERCEL_REGION || 'not set',
      vercelUrl: process.env.VERCEL_URL || 'not set'
    };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      environment: envCheck,
      message: 'Serverless function is working correctly!',
      deployment: {
        region: process.env.VERCEL_REGION,
        url: process.env.VERCEL_URL,
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
        gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
