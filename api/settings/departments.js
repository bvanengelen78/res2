// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schemas
const departmentCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional()
});

const departmentUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// Mock data fallback
const mockDepartments = [
  {
    id: 1,
    name: "IT Architecture & Delivery",
    description: "Responsible for technology architecture and software delivery",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 2,
    name: "Product Management",
    description: "Manages product strategy and roadmap",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 3,
    name: "Data & Analytics",
    description: "Handles data science and business intelligence",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 4,
    name: "Quality Assurance",
    description: "Ensures software quality and testing standards",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
  {
    id: 5,
    name: "DevOps & Infrastructure",
    description: "Manages deployment pipelines and infrastructure",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  },
];

// Main departments handler
const departmentsHandler = async (req, res, { user, validatedData }) => {
  Logger.info('Handling departments request', {
    userId: user.id,
    method: req.method,
    userPermissions: user.permissions
  });

  // Check for SYSTEM_ADMIN permission
  if (!user.permissions.includes('system_admin')) {
    Logger.warn('Access denied: User lacks SYSTEM_ADMIN permission', {
      userId: user.id,
      permissions: user.permissions
    });
    return createErrorResponse(res, 403, 'Access denied. SYSTEM_ADMIN permission required.');
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetDepartments(req, res, user);
      case 'POST':
        return await handleCreateDepartment(req, res, user, validatedData);
      default:
        return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }
  } catch (error) {
    Logger.error('Error in departments handler', error);
    return createErrorResponse(res, 500, 'Internal server error');
  }
};

// Get departments
const handleGetDepartments = async (req, res, user) => {
  try {
    Logger.info('Fetching departments', { userId: user.id });

    // Try to get data from database first
    let departments;
    try {
      departments = await DatabaseService.getDepartments();
      Logger.info('Successfully fetched departments from database', { 
        count: departments.length,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, using mock data', { 
        error: dbError.message,
        userId: user.id 
      });
      // Fallback to mock data
      departments = mockDepartments;
    }

    return createSuccessResponse(res, departments);
  } catch (error) {
    Logger.error('Error fetching departments', error);
    // Final fallback to mock data
    return createSuccessResponse(res, mockDepartments);
  }
};

// Create department
const handleCreateDepartment = async (req, res, user, validatedData) => {
  try {
    Logger.info('Creating department', { 
      userId: user.id,
      data: validatedData 
    });

    // Try to create in database first
    let department;
    try {
      department = await DatabaseService.createDepartment(validatedData);
      Logger.info('Successfully created department in database', { 
        departmentId: department.id,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, simulating creation', { 
        error: dbError.message,
        userId: user.id 
      });
      // Simulate creation with mock data
      department = {
        id: Math.max(...mockDepartments.map(d => d.id)) + 1,
        ...validatedData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDepartments.push(department);
    }

    return createSuccessResponse(res, department, 201);
  } catch (error) {
    Logger.error('Error creating department', error);
    return createErrorResponse(res, 500, 'Failed to create department');
  }
};

// Export the handler with middleware
module.exports = withMiddleware(
  departmentsHandler,
  {
    requireAuth: true,
    validateInput: {
      POST: departmentCreateSchema
    }
  }
);
