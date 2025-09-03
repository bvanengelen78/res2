// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('../../lib/middleware');
const { DatabaseService } = require('../../lib/supabase');

// Input validation schemas
const departmentUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

// Mock data fallback (shared with main endpoint)
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

// Main department by ID handler
const departmentByIdHandler = async (req, res, { user, validatedData }) => {
  const departmentId = parseInt(req.query.id);
  
  if (!departmentId) {
    return createErrorResponse(res, 400, 'Invalid department ID');
  }

  Logger.info('Handling department by ID request', {
    userId: user.id,
    method: req.method,
    departmentId,
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
        return await handleGetDepartment(req, res, user, departmentId);
      case 'PUT':
        return await handleUpdateDepartment(req, res, user, departmentId, validatedData);
      case 'DELETE':
        return await handleDeleteDepartment(req, res, user, departmentId);
      default:
        return createErrorResponse(res, 405, `Method ${req.method} not allowed`);
    }
  } catch (error) {
    Logger.error('Error in department by ID handler', error);
    return createErrorResponse(res, 500, 'Internal server error');
  }
};

// Get single department
const handleGetDepartment = async (req, res, user, departmentId) => {
  try {
    Logger.info('Fetching department by ID', { userId: user.id, departmentId });

    // Try to get data from database first
    let department;
    try {
      department = await DatabaseService.getDepartment(departmentId);
      if (department) {
        Logger.info('Successfully fetched department from database', { 
          departmentId,
          userId: user.id 
        });
        return createSuccessResponse(res, department);
      }
    } catch (dbError) {
      Logger.warn('Database unavailable, using mock data', { 
        error: dbError.message,
        userId: user.id 
      });
    }

    // Fallback to mock data
    department = mockDepartments.find(d => d.id === departmentId);
    if (!department) {
      return createErrorResponse(res, 404, 'Department not found');
    }

    return createSuccessResponse(res, department);
  } catch (error) {
    Logger.error('Error fetching department', error);
    return createErrorResponse(res, 500, 'Failed to fetch department');
  }
};

// Update department
const handleUpdateDepartment = async (req, res, user, departmentId, validatedData) => {
  try {
    Logger.info('Updating department', { 
      userId: user.id,
      departmentId,
      data: validatedData 
    });

    // Try to update in database first
    let department;
    try {
      department = await DatabaseService.updateDepartment(departmentId, validatedData);
      Logger.info('Successfully updated department in database', { 
        departmentId,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, simulating update', { 
        error: dbError.message,
        userId: user.id 
      });
      // Simulate update with mock data
      const index = mockDepartments.findIndex(d => d.id === departmentId);
      if (index === -1) {
        return createErrorResponse(res, 404, 'Department not found');
      }
      
      department = {
        ...mockDepartments[index],
        ...validatedData,
        updatedAt: new Date(),
      };
      mockDepartments[index] = department;
    }

    return createSuccessResponse(res, department);
  } catch (error) {
    Logger.error('Error updating department', error);
    return createErrorResponse(res, 500, 'Failed to update department');
  }
};

// Delete department
const handleDeleteDepartment = async (req, res, user, departmentId) => {
  try {
    Logger.info('Deleting department', { 
      userId: user.id,
      departmentId 
    });

    // Try to delete in database first
    try {
      await DatabaseService.deleteDepartment(departmentId);
      Logger.info('Successfully deleted department in database', { 
        departmentId,
        userId: user.id 
      });
    } catch (dbError) {
      Logger.warn('Database unavailable, simulating deletion', { 
        error: dbError.message,
        userId: user.id 
      });
      // Simulate deletion with mock data
      const index = mockDepartments.findIndex(d => d.id === departmentId);
      if (index === -1) {
        return createErrorResponse(res, 404, 'Department not found');
      }
      
      mockDepartments[index].isActive = false;
      mockDepartments[index].updatedAt = new Date();
    }

    return res.status(204).send();
  } catch (error) {
    Logger.error('Error deleting department', error);
    return createErrorResponse(res, 500, 'Failed to delete department');
  }
};

// Export the handler with middleware
module.exports = withMiddleware(
  departmentByIdHandler,
  {
    requireAuth: false, // Changed to false for demo mode
    validateInput: {
      PUT: departmentUpdateSchema
    }
  }
);
