// Supabase health check endpoint to test database connectivity
// This helps isolate database connection issues from authentication problems

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
    console.log('[SUPABASE_HEALTH] Starting Supabase health check', {
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV
    });

    // Check environment variables
    const envCheck = {
      SUPABASE_URL_SET: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      SUPABASE_URL: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'not set'
    };

    console.log('[SUPABASE_HEALTH] Environment check:', envCheck);

    if (!envCheck.SUPABASE_URL_SET || !envCheck.SUPABASE_SERVICE_ROLE_KEY_SET) {
      return res.status(500).json({
        success: false,
        error: 'Missing Supabase configuration',
        environment: envCheck,
        timestamp: new Date().toISOString()
      });
    }

    // Try to import and initialize Supabase
    let supabaseStatus = {
      moduleLoaded: false,
      clientInitialized: false,
      connectionTested: false,
      error: null
    };

    try {
      console.log('[SUPABASE_HEALTH] Attempting to load Supabase module');
      
      // Try to load the Supabase client directly without circular dependencies
      const { createClient } = require('@supabase/supabase-js');
      supabaseStatus.moduleLoaded = true;
      
      console.log('[SUPABASE_HEALTH] Creating Supabase client');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      supabaseStatus.clientInitialized = true;

      console.log('[SUPABASE_HEALTH] Testing database connection');
      const startTime = Date.now();
      
      // Simple query to test connection
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      const responseTime = Date.now() - startTime;
      
      if (error) {
        supabaseStatus.error = error.message;
        console.error('[SUPABASE_HEALTH] Database query failed:', error);
        
        return res.status(500).json({
          success: false,
          error: 'Database connection failed',
          details: {
            environment: envCheck,
            supabase: supabaseStatus,
            dbError: error.message,
            responseTime
          },
          timestamp: new Date().toISOString()
        });
      }

      supabaseStatus.connectionTested = true;
      console.log('[SUPABASE_HEALTH] Database connection successful');

      return res.status(200).json({
        success: true,
        message: 'Supabase connection healthy',
        details: {
          environment: envCheck,
          supabase: supabaseStatus,
          responseTime,
          queryResult: data ? 'success' : 'no_data'
        },
        timestamp: new Date().toISOString()
      });

    } catch (supabaseError) {
      supabaseStatus.error = supabaseError.message;
      console.error('[SUPABASE_HEALTH] Supabase initialization failed:', supabaseError);
      
      return res.status(500).json({
        success: false,
        error: 'Supabase initialization failed',
        details: {
          environment: envCheck,
          supabase: supabaseStatus,
          initError: supabaseError.message
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[SUPABASE_HEALTH] Critical error in health check', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
