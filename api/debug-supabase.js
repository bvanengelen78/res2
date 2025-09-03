// Debug endpoint to test Supabase connection in production

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
    console.log('[DEBUG_SUPABASE] Starting Supabase connection test');

    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      
      // Environment variables check
      environmentVariables: {
        SUPABASE_URL_SET: !!process.env.SUPABASE_URL,
        SUPABASE_URL: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'not set',
        SUPABASE_SERVICE_ROLE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_SERVICE_ROLE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
        DATABASE_URL_SET: !!process.env.DATABASE_URL
      },
      
      // Test Supabase client creation
      supabaseClientTest: null,
      
      // Test DatabaseService import
      databaseServiceTest: null,
      
      // Test actual database query
      databaseQueryTest: null
    };

    // Test 1: Create Supabase client directly
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase environment variables');
      }
      
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
      
      debugInfo.supabaseClientTest = {
        success: true,
        clientCreated: !!supabase,
        url: process.env.SUPABASE_URL.substring(0, 30) + '...'
      };
      
      // Test 2: Simple query
      const { data, error } = await supabase
        .from('resources')
        .select('id, name')
        .limit(1);
      
      if (error) {
        debugInfo.databaseQueryTest = {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details
        };
      } else {
        debugInfo.databaseQueryTest = {
          success: true,
          dataReceived: !!data,
          recordCount: data ? data.length : 0,
          sampleData: data && data.length > 0 ? data[0] : null
        };
      }
      
    } catch (error) {
      debugInfo.supabaseClientTest = {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }

    // Test 3: DatabaseService import and usage
    try {
      const { DatabaseService } = require('./lib/supabase');
      
      debugInfo.databaseServiceTest = {
        imported: true,
        hasGetResources: typeof DatabaseService.getResources === 'function',
        hasGetResourceAllocations: typeof DatabaseService.getResourceAllocations === 'function'
      };
      
      // Try to call getResources
      try {
        const resources = await DatabaseService.getResources();
        debugInfo.databaseServiceTest.getResourcesTest = {
          success: true,
          resourceCount: resources ? resources.length : 0
        };
      } catch (dbError) {
        debugInfo.databaseServiceTest.getResourcesTest = {
          success: false,
          error: dbError.message
        };
      }
      
    } catch (error) {
      debugInfo.databaseServiceTest = {
        imported: false,
        error: error.message,
        stack: error.stack
      };
    }

    console.log('[DEBUG_SUPABASE] Debug info collected:', debugInfo);

    return res.status(200).json({
      success: true,
      data: debugInfo
    });

  } catch (error) {
    console.error('[DEBUG_SUPABASE] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
