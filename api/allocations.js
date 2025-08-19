// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schema
const allocationsQuerySchema = z.object({
  resourceId: z.string().optional(),
  projectId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  department: z.string().optional()
});

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

  try {
    // Fetch allocations from Supabase
    let allocations = await DatabaseService.getResourceAllocations();
    
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

    return res.json(allocations);
  } catch (error) {
    Logger.error('Failed to fetch resource allocations', error, { userId: user.id });
    
    // Return safe fallback data structure
    const fallbackAllocations = [];
    return res.json(fallbackAllocations);
  }
};

// Export with middleware
module.exports = withMiddleware(allocationsHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: allocationsQuerySchema
});
