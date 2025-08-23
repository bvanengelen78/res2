// Simple Login Endpoint for Testing
// POST /api/login

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Initialize Supabase client
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: 'Authentication service not configured'
      });
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

    // Authenticate user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Get user profile and roles
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        *,
        user_roles!inner(
          role_id,
          is_active,
          roles(name, display_name)
        )
      `)
      .eq('id', authData.user.id)
      .eq('user_roles.is_active', true)
      .single();

    // Get user permissions
    const { data: userPermissions } = await supabase
      .rpc('get_user_permissions', { user_id: authData.user.id });

    const user = {
      id: authData.user.id,
      email: authData.user.email,
      firstName: userProfile?.first_name,
      lastName: userProfile?.last_name,
      roles: userProfile?.user_roles?.map(ur => ur.roles?.name).filter(Boolean) || [],
      permissions: userPermissions || [],
      resourceId: userProfile?.resource_id
    };

    return res.status(200).json({
      success: true,
      user,
      tokens: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
