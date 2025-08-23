// Database Connectivity Test Endpoint
// GET /api/debug/db-test

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
    console.log('[DB-TEST] Starting database connectivity test');

    // Check environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        status: 'error',
        error: 'Missing Supabase environment variables',
        details: {
          hasUrl: !!process.env.SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      });
    }

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

    console.log('[DB-TEST] Supabase client created');

    // Test 1: Check departments table
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .limit(5);

    console.log('[DB-TEST] Departments query result:', { 
      success: !deptError, 
      count: departments?.length || 0,
      error: deptError?.message 
    });

    // Test 2: Check job_roles table
    const { data: jobRoles, error: rolesError } = await supabase
      .from('job_roles')
      .select('id, name')
      .limit(5);

    console.log('[DB-TEST] Job roles query result:', { 
      success: !rolesError, 
      count: jobRoles?.length || 0,
      error: rolesError?.message 
    });

    // Test 3: Check user_profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email')
      .limit(3);

    console.log('[DB-TEST] User profiles query result:', { 
      success: !profilesError, 
      count: profiles?.length || 0,
      error: profilesError?.message 
    });

    // Test 4: Check resources table
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select('id, name, email')
      .limit(3);

    console.log('[DB-TEST] Resources query result:', { 
      success: !resourcesError, 
      count: resources?.length || 0,
      error: resourcesError?.message 
    });

    // Test 5: Check roles and permissions tables
    const { data: roles, error: rolesTableError } = await supabase
      .from('roles')
      .select('id, name')
      .limit(5);

    console.log('[DB-TEST] Roles query result:', { 
      success: !rolesTableError, 
      count: roles?.length || 0,
      error: rolesTableError?.message 
    });

    const testResults = {
      departments: {
        success: !deptError,
        count: departments?.length || 0,
        error: deptError?.message || null,
        sample: departments?.slice(0, 2) || []
      },
      jobRoles: {
        success: !rolesError,
        count: jobRoles?.length || 0,
        error: rolesError?.message || null,
        sample: jobRoles?.slice(0, 2) || []
      },
      userProfiles: {
        success: !profilesError,
        count: profiles?.length || 0,
        error: profilesError?.message || null
      },
      resources: {
        success: !resourcesError,
        count: resources?.length || 0,
        error: resourcesError?.message || null
      },
      roles: {
        success: !rolesTableError,
        count: roles?.length || 0,
        error: rolesTableError?.message || null,
        sample: roles?.slice(0, 2) || []
      }
    };

    const overallSuccess = Object.values(testResults).every(test => test.success);

    return res.status(200).json({
      status: overallSuccess ? 'success' : 'partial_failure',
      timestamp: new Date().toISOString(),
      testResults,
      summary: {
        totalTests: 5,
        passedTests: Object.values(testResults).filter(test => test.success).length,
        failedTests: Object.values(testResults).filter(test => !test.success).length
      }
    });

  } catch (error) {
    console.error('[DB-TEST] Unexpected error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack,
      message: 'Database connectivity test failed'
    });
  }
};
