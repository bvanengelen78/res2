// Environment Variables Debug Endpoint
// GET /api/debug/env-check

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables (without exposing sensitive values)
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
      supabaseUrlLength: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.length : 0,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      vercelRegion: process.env.VERCEL_REGION || 'unknown',
      vercelUrl: process.env.VERCEL_URL || 'unknown'
    };

    console.log('[ENV-CHECK] Environment variables check:', envCheck);

    // Test Supabase connection if variables are available
    let supabaseTest = null;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = require('@supabase/supabase-js');
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

        // Test a simple query
        const { data, error } = await supabase
          .from('departments')
          .select('count')
          .limit(1);

        supabaseTest = {
          connectionSuccess: !error,
          error: error?.message || null,
          hasData: !!data
        };
      } catch (supabaseError) {
        supabaseTest = {
          connectionSuccess: false,
          error: supabaseError.message,
          hasData: false
        };
      }
    }

    return res.status(200).json({
      status: 'success',
      environment: envCheck,
      supabaseTest,
      message: 'Environment check completed'
    });

  } catch (error) {
    console.error('[ENV-CHECK] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      message: 'Environment check failed'
    });
  }
};
