// RBAC Create User Endpoint
// POST /api/rbac/create-user
// Creates a new user with resource and assigns initial role (admin only)

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');
const bcrypt = require('bcryptjs');
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
  role: z.enum(['regular_user', 'admin', 'manager'], {
    errorMap: () => ({ message: 'Role must be one of: regular_user, admin, manager' })
  }).optional(),
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
    const { name, email, role, department, jobRole, capacity } = validatedData;

    Logger.info('RBAC create user request', {
      adminUserId: user.id,
      adminEmail: user.email,
      newUserEmail: email,
      newUserName: name,
      assignedRole: role
    });

    // Check if user already exists
    const existingUser = await DatabaseService.getUserByEmail(email);
    if (existingUser) {
      Logger.warn('Create user failed - user already exists', { 
        email, 
        adminUserId: user.id 
      });
      return createErrorResponse(res, 400, 'User with this email already exists');
    }

    // Create resource first
    Logger.info('Creating resource for new user', { name, email, department, jobRole });
    const resource = await DatabaseService.createResource({
      name,
      email,
      role: jobRole,
      department,
      capacity,
      skills: [],
      hourlyRate: 0,
      isActive: true,
    });

    Logger.info('Resource created successfully', { 
      resourceId: resource.id, 
      name, 
      email 
    });

    // Create user account with default password
    const defaultPassword = generateDefaultPassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);
    
    Logger.info('Creating user account', { email, resourceId: resource.id });
    const newUser = await DatabaseService.createUser({
      email,
      password: hashedPassword,
      resourceId: resource.id,
      isActive: true,
    });

    Logger.info('User account created successfully', { 
      userId: newUser.id, 
      email, 
      resourceId: resource.id 
    });

    // Assign initial role if provided
    if (role) {
      Logger.info('Assigning initial role', { 
        userId: newUser.id, 
        role, 
        assignedBy: user.id 
      });
      
      await DatabaseService.assignUserRole({
        userId: newUser.id,
        role,
        resourceId: resource.id,
        assignedBy: user.id
      });

      Logger.info('Initial role assigned successfully', { 
        userId: newUser.id, 
        role 
      });
    }

    // Log the successful user creation
    Logger.info('User created successfully by admin', {
      newUser: {
        id: newUser.id,
        email: newUser.email,
        resourceId: newUser.resourceId
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
        id: newUser.id,
        email: newUser.email,
        resourceId: newUser.resourceId,
      },
      resource: {
        id: resource.id,
        name: resource.name,
        email: resource.email,
        role: resource.role,
        department: resource.department,
        capacity: resource.capacity
      },
      assignedRole: role,
      defaultPassword, // In production, this would be sent via email
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
  requirePermissions: ['role_management'], // Role management permission required
  allowedMethods: ['POST'],
  validateSchema: {
    POST: createUserSchema
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 5 // 5 user creations per minute max
  }
});
