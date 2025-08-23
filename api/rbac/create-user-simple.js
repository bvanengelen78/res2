// Simplified Create User Endpoint for Debugging
// POST /api/rbac/create-user-simple

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
    console.log('=== CREATE USER SIMPLE DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);

    // Test basic validation
    const { name, email, firstName, lastName, password, role = 'user' } = req.body || {};

    if (!name || !email || !firstName || !lastName || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email', 'firstName', 'lastName', 'password'],
        received: Object.keys(req.body || {})
      });
    }

    // Test environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: 'Missing environment variables',
        hasUrl: !!process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
    }

    // Test Supabase import and connection
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

    console.log('Supabase client created successfully');

    // Test authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    console.log('Authentication successful for user:', user.email);

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    console.log('Email uniqueness check passed');

    // Create user in Supabase Auth
    const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: name,
        role: role,
      },
    });

    if (createAuthError) {
      console.error('Auth creation error:', createAuthError);
      return res.status(500).json({ 
        error: 'Failed to create auth user', 
        details: createAuthError.message 
      });
    }

    const authUserId = authData.user.id;
    console.log('Auth user created:', authUserId);

    // Create a simple resource record
    const { data: resourceData, error: resourceError } = await supabase
      .from('resources')
      .insert({
        name: name,
        email: email,
        role: req.body.jobRole || 'Employee',
        department: req.body.department || 'General',
        capacity: req.body.capacity || 40,
        skills: [],
        hourly_rate: 0,
        is_active: true,
      })
      .select()
      .single();

    if (resourceError) {
      console.error('Resource creation error:', resourceError);
      return res.status(500).json({ 
        error: 'Failed to create resource', 
        details: resourceError.message 
      });
    }

    console.log('Resource created:', resourceData.id);

    // Create user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUserId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        resource_id: resourceData.id,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return res.status(500).json({ 
        error: 'Failed to create user profile', 
        details: profileError.message 
      });
    }

    console.log('User profile created:', userProfile.id);

    // Assign role
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (roleError || !roleData) {
      console.error('Role lookup error:', roleError);
      return res.status(500).json({ 
        error: 'Failed to find role', 
        role: role,
        details: roleError?.message 
      });
    }

    const { error: roleAssignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userProfile.id,
        role_id: roleData.id,
        assigned_by: user.id,
        is_active: true,
      });

    if (roleAssignError) {
      console.error('Role assignment error:', roleAssignError);
      return res.status(500).json({ 
        error: 'Failed to assign role', 
        details: roleAssignError.message 
      });
    }

    console.log('Role assigned successfully');

    // Success response
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        role: role
      },
      resource: {
        id: resourceData.id,
        name: resourceData.name,
        department: resourceData.department
      },
      defaultPassword: password
    });

  } catch (error) {
    console.error('Unexpected error in create-user-simple:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    });
  }
};
