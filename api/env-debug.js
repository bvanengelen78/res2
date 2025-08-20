// Environment debug endpoint for Vercel production debugging

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
    console.log('[ENV_DEBUG] Environment debug request', {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV
    });

    const envInfo = {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      nodeVersion: process.version,
      
      // Environment variables (without exposing secrets)
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET_SET: !!process.env.JWT_SECRET,
        JWT_SECRET_LENGTH: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
        SUPABASE_URL_SET: !!process.env.SUPABASE_URL,
        SUPABASE_URL: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'not set',
        SUPABASE_SERVICE_ROLE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        DATABASE_URL_SET: !!process.env.DATABASE_URL,
        
        // Vercel-specific environment variables
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
        VERCEL_REGION: process.env.VERCEL_REGION
      },
      
      // Runtime information
      runtime: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        cwd: process.cwd()
      },
      
      // Request information
      request: {
        method: req.method,
        url: req.url,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type'],
          'authorization': req.headers.authorization ? 'Bearer ***' : 'not set'
        }
      }
    };

    console.log('[ENV_DEBUG] Environment info collected', {
      nodeEnv: envInfo.nodeEnv,
      jwtSecretSet: envInfo.environment.JWT_SECRET_SET,
      supabaseUrlSet: envInfo.environment.SUPABASE_URL_SET,
      vercelEnv: envInfo.environment.VERCEL_ENV
    });

    return res.status(200).json({
      success: true,
      data: envInfo
    });

  } catch (error) {
    console.error('[ENV_DEBUG] Error in environment debug', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: 'Environment debug failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
