// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

/**
 * Health check endpoint for Settings API debugging
 * This endpoint helps diagnose issues with the serverless functions
 */
module.exports = async (req, res) => {
  try {
    console.log('[HEALTH_CHECK] Starting health check', {
      method: req.method,
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET
    });

    // Basic environment check
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      SUPABASE_URL: process.env.SUPABASE_URL ? 'configured' : 'missing',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing'
    };

    // Test middleware imports
    let middlewareStatus = 'unknown';
    let middlewareError = null;
    try {
      const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
      middlewareStatus = 'available';
      console.log('[HEALTH_CHECK] Middleware imported successfully');
    } catch (middlewareErr) {
      middlewareStatus = 'failed';
      middlewareError = middlewareErr.message;
      console.error('[HEALTH_CHECK] Middleware import failed', {
        error: middlewareErr.message,
        stack: middlewareErr.stack
      });
    }

    // Test database service import
    let databaseStatus = 'unknown';
    let databaseError = null;
    try {
      const { DatabaseService } = require('../lib/supabase');
      databaseStatus = 'available';
      console.log('[HEALTH_CHECK] DatabaseService imported successfully');
    } catch (dbErr) {
      databaseStatus = 'failed';
      databaseError = dbErr.message;
      console.error('[HEALTH_CHECK] DatabaseService import failed', {
        error: dbErr.message,
        stack: dbErr.stack
      });
    }

    // Test basic response
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      services: {
        middleware: {
          status: middlewareStatus,
          error: middlewareError
        },
        database: {
          status: databaseStatus,
          error: databaseError
        }
      },
      request: {
        method: req.method,
        url: req.url,
        headers: {
          authorization: req.headers.authorization ? 'present' : 'missing',
          'content-type': req.headers['content-type'] || 'not set'
        }
      }
    };

    console.log('[HEALTH_CHECK] Health check completed successfully', healthData);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return res.status(200).json({
      success: true,
      data: healthData
    });

  } catch (error) {
    console.error('[HEALTH_CHECK] Critical error in health check', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Even if everything fails, try to return a basic response
    try {
      return res.status(500).json({
        success: false,
        error: {
          message: error.message,
          timestamp: new Date().toISOString(),
          type: 'health_check_failure'
        }
      });
    } catch (responseError) {
      console.error('[HEALTH_CHECK] Failed to send error response', {
        error: responseError.message,
        stack: responseError.stack
      });
      
      // Last resort - basic text response
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Health check failed: ${error.message}`);
    }
  }
};
