const { DatabaseService } = require('./lib/supabase');

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Health check handler
async function handleHealth(req, res) {
  try {
    // Check Supabase database connectivity
    const healthCheck = await DatabaseService.checkHealth();

    // Add environment information
    const response = {
      ...healthCheck,
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        supabaseUrl: process.env.SUPABASE_URL ? 'configured' : 'missing',
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
      },
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        deployment: process.env.VERCEL_URL || 'local'
      }
    };

    // Return appropriate status code based on health
    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Ping handler
async function handlePing(req, res) {
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
}

// Export individual handlers for use by endpoint files
module.exports = {
  handleHealth,
  handlePing,
  setCorsHeaders
};
