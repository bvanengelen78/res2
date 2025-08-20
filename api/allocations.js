// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schemas
const allocationsQuerySchema = z.object({
  resourceId: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  department: z.string().optional()
});

// Schema for creating/updating allocations
const createAllocationSchema = z.object({
  projectId: z.number().int().positive('Project ID must be a positive integer'),
  resourceId: z.number().int().positive('Resource ID must be a positive integer'),
  allocatedHours: z.string().min(1, 'Allocated hours is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  role: z.string().optional(),
  status: z.enum(['active', 'planned', 'completed']).optional().default('active')
});

const updateAllocationSchema = createAllocationSchema.partial();

// Main allocations handler
const allocationsHandler = async (req, res, { user, validatedData }) => {
  const { resourceId, projectId, startDate, endDate, status, department } = validatedData;

  Logger.info('Fetching resource allocations', {
    userId: user.id,
    resourceId,
    projectId,
    startDate,
    endDate,
    status,
    department
  });

  // Always return a safe response, never throw errors to middleware
  let allocations = [];

  try {
    // Fetch allocations from Supabase
    allocations = await DatabaseService.getResourceAllocations();
    
    // Apply filters
    if (resourceId) {
      allocations = allocations.filter(allocation => allocation.resourceId === parseInt(resourceId));
    }

    if (projectId) {
      allocations = allocations.filter(allocation => allocation.projectId === parseInt(projectId));
    }

    if (status !== 'all') {
      allocations = allocations.filter(allocation => allocation.status === status);
    }

    if (startDate && endDate) {
      const filterStartDate = new Date(startDate);
      const filterEndDate = new Date(endDate);
      
      allocations = allocations.filter(allocation => {
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        
        // Include allocations that overlap with the filter period
        return allocationStart <= filterEndDate && allocationEnd >= filterStartDate;
      });
    }

    // If department filter is specified, we need to join with resources
    if (department && department !== 'all') {
      const resources = await DatabaseService.getResources();
      const departmentResourceIds = resources
        .filter(r => {
          const resourceDepartment = r.department || r.role || 'General';
          return resourceDepartment === department;
        })
        .map(r => r.id);
      
      allocations = allocations.filter(allocation => 
        departmentResourceIds.includes(allocation.resourceId)
      );
    }

    Logger.info('Resource allocations fetched successfully', {
      userId: user.id,
      count: allocations.length,
      filters: { resourceId, projectId, status, department }
    });

  } catch (error) {
    Logger.error('Failed to fetch resource allocations', error, { userId: user.id });
    // Don't throw - just use empty array as fallback
    allocations = [];
  }

  // Always return a valid array (never throw errors to middleware)
  return res.json(allocations);
};

// Create allocation handler
const createAllocationHandler = async (req, res, { user, validatedData }) => {
  Logger.info('Creating new resource allocation', {
    userId: user.id,
    data: validatedData
  });

  try {
    // Use Supabase client directly for creation
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const insertData = {
      project_id: validatedData.projectId,
      resource_id: validatedData.resourceId,
      allocated_hours: validatedData.allocatedHours,
      start_date: validatedData.startDate,
      end_date: validatedData.endDate,
      role: validatedData.role || null,
      status: validatedData.status || 'active',
      weekly_allocations: {}
    };

    const { data, error } = await supabase
      .from('resource_allocations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create allocation in database', error, {
        userId: user.id,
        data: validatedData
      });
      throw new Error(`Database error: ${error.message}`);
    }

    // Convert to camelCase for response
    const allocation = {
      id: data.id,
      projectId: data.project_id,
      resourceId: data.resource_id,
      allocatedHours: data.allocated_hours,
      startDate: data.start_date,
      endDate: data.end_date,
      role: data.role,
      status: data.status,
      weeklyAllocations: data.weekly_allocations,
      createdAt: data.created_at
    };

    Logger.info('Allocation created successfully', {
      userId: user.id,
      allocationId: allocation.id,
      projectId: allocation.projectId,
      resourceId: allocation.resourceId
    });

    return res.status(201).json(allocation);
  } catch (error) {
    Logger.error('Failed to create allocation', error, { userId: user.id });
    return res.status(500).json({ message: 'Failed to create allocation' });
  }
};

// Main handler that routes based on HTTP method
const allocationsMainHandler = async (req, res, context) => {
  const { method } = req;

  switch (method) {
    case 'GET':
      return allocationsHandler(req, res, context);
    case 'POST':
      // Validate with create schema
      const createValidation = createAllocationSchema.safeParse(req.body);
      if (!createValidation.success) {
        Logger.warn('Invalid allocation data for creation', {
          errors: createValidation.error.errors,
          userId: context.user?.id
        });
        return res.status(400).json({
          message: 'Invalid allocation data',
          errors: createValidation.error.errors
        });
      }
      return createAllocationHandler(req, res, {
        ...context,
        validatedData: createValidation.data
      });
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
};

// Export with middleware
module.exports = withMiddleware(allocationsMainHandler, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST'],
  validateSchema: allocationsQuerySchema // Only for GET requests
});
