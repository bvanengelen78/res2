// RBAC Create User Endpoint
// POST /api/rbac/create-user
// Creates a new user with resource and assigns initial role (admin only)

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Input validation schema
const createUserSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  role: z.enum(['user', 'manager', 'admin'], {
    errorMap: () => ({ message: 'Role must be one of: user, manager, admin' })
  }).optional().default('user'),
  department: z.string()
    .max(100, 'Department must be less than 100 characters')
    .trim()
    .optional()
    .default('General'),
  jobRole: z.string()
    .max(100, 'Job role must be less than 100 characters')
    .trim()
    .optional()
    .default('Employee'),
  capacity: z.number()
    .int()
    .min(1, 'Capacity must be at least 1 hour')
    .max(80, 'Capacity must be less than 80 hours per week')
    .optional()
    .default(40)
});

/**
 * Generate a secure random password for new users
 */
function generateDefaultPassword() {
  // Generate a 12-character password with mixed case, numbers
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  
  for (let i = 0; i < 12; i++) {
    const randomIndex = crypto.randomBytes(1)[0] % chars.length;
    password += chars[randomIndex];
  }
  
  return password;
}

// Main handler
const createUserHandler = async (req, res, { user, validatedData }) => {
  try {
    const { name, email, firstName, lastName, password, role, department, jobRole, capacity } = validatedData;

    Logger.info('RBAC create user request', {
      adminUserId: user.id,
      adminEmail: user.email,
      newUserEmail: email,
      newUserName: name,
      assignedRole: role
    });

    // Check if user already exists in Supabase Auth
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

    // Check if user already exists in our user_profiles table
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      Logger.warn('Create user failed - user already exists', {
        email,
        adminUserId: user.id
      });
      return createErrorResponse(res, 400, 'User with this email already exists');
    }

    // Create user in Supabase Auth first
    Logger.info('Creating user in Supabase Auth', { email, firstName, lastName });

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email for admin-created users
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: name,
        role: role,
      },
    });

    if (authError) {
      Logger.error('Failed to create user in Supabase Auth', authError, { email });
      throw new Error(`Authentication error: ${authError.message}`);
    }

    const authUserId = authData.user.id;
    Logger.info('User created in Supabase Auth successfully', {
      authUserId,
      email
    });

    // Create resource directly using Supabase
    Logger.info('Creating resource for new user', { name, email, department, jobRole });
    const { data: resourceData, error: resourceError } = await supabase
      .from('resources')
      .insert({
        name,
        email,
        role: jobRole,
        department,
        weekly_capacity: capacity,
        skills: [],
        is_active: true,
      })
      .select()
      .single();

    if (resourceError) {
      Logger.error('Failed to create resource', resourceError, { name, email });
      throw new Error(`Resource creation error: ${resourceError.message}`);
    }

    const resource = resourceData;
    Logger.info('Resource created successfully', {
      resourceId: resource.id,
      name,
      email
    });

    // Create user profile in our database
    Logger.info('Creating user profile', { authUserId, email, resourceId: resource.id });
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUserId,
        email: email,
        first_name: firstName,
        last_name: lastName,
        resource_id: resource.id,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      Logger.error('Failed to create user profile', profileError, { authUserId, email });
      throw new Error(`Profile creation error: ${profileError.message}`);
    }

    Logger.info('User profile created successfully', {
      userId: userProfile.id,
      email,
      resourceId: resource.id
    });

    // Assign initial role
    Logger.info('Assigning initial role', {
      userId: userProfile.id,
      role,
      assignedBy: user.id
    });

    // Get role ID from roles table
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role)
      .single();

    if (roleError || !roleData) {
      Logger.error('Failed to find role', roleError, { role });
      throw new Error(`Role not found: ${role}`);
    }

    // Assign role to user
    const { error: roleAssignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: userProfile.id,
        role_id: roleData.id,
        assigned_by: user.id,
        is_active: true,
      });

    if (roleAssignError) {
      Logger.error('Failed to assign role', roleAssignError, {
        userId: userProfile.id,
        roleId: roleData.id
      });
      throw new Error(`Role assignment error: ${roleAssignError.message}`);
    }

    Logger.info('Initial role assigned successfully', {
      userId: userProfile.id,
      role,
      roleId: roleData.id
    });

    // Log the successful user creation
    Logger.info('User created successfully by admin', {
      newUser: {
        id: userProfile.id,
        email: userProfile.email,
        resourceId: userProfile.resource_id
      },
      resource: {
        id: resource.id,
        name: resource.name,
        department: resource.department,
        role: resource.role
      },
      assignedRole: role,
      admin: {
        id: user.id,
        email: user.email
      },
      timestamp: new Date().toISOString()
    });

    return createSuccessResponse(res, {
      message: 'User created successfully',
      user: {
        id: userProfile.id,
        email: userProfile.email,
        resourceId: userProfile.resource_id,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        fullName: `${userProfile.first_name} ${userProfile.last_name}`,
        role: role
      },
      resource: {
        id: resource.id,
        name: resource.name,
        email: resource.email,
        role: resource.role,
        department: resource.department,
        capacity: resource.weekly_capacity
      },
      assignedRole: role,
      defaultPassword: password, // Return the password that was used
      // Security note: Password is only returned once for admin to communicate to user
      passwordNote: 'This password will only be shown once. Please securely communicate it to the user.'
    }, 201);

  } catch (error) {
    Logger.error('Failed to create user', {
      error: error.message,
      stack: error.stack,
      adminUserId: user?.id,
      requestData: {
        name: req.body?.name,
        email: req.body?.email,
        role: req.body?.role
      }
    });

    return createErrorResponse(res, 500, 'Failed to create user');
  }
};

// Export with middleware
module.exports = withMiddleware(createUserHandler, {
  requireAuth: true,
  allowedMethods: ['POST'],
  validateSchema: createUserSchema,
  requiredPermissions: ['user_management'], // Add required permission
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 5 // 5 user creations per minute max
  }
});
