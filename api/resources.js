const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schema
const resourcesQuerySchema = z.object({
  department: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  includeAllocations: z.string().transform(val => val === 'true').optional().default(false),
  search: z.string().optional()
});

// Main resources handler
const resourcesHandler = async (req, res, { user, validatedData }) => {
  const { department, status, includeAllocations, search } = validatedData;

  Logger.info('Fetching resources', {
    userId: user.id,
    department,
    status,
    includeAllocations,
    search
  });

  try {
    // Fetch resources from Supabase (no fallback to mock data)
    let resources = await DatabaseService.getResources();

    // Apply filters
    if (department && department !== 'all') {
      resources = resources.filter(resource => {
        const resourceDepartment = resource.department || resource.role || 'General';
        return resourceDepartment === department;
      });
    }

    if (status !== 'all') {
      const isActive = status === 'active';
      resources = resources.filter(resource => resource.isActive === isActive);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      resources = resources.filter(resource =>
        resource.name.toLowerCase().includes(searchLower) ||
        resource.email.toLowerCase().includes(searchLower) ||
        (resource.role && resource.role.toLowerCase().includes(searchLower)) ||
        (resource.department && resource.department.toLowerCase().includes(searchLower))
      );
    }

    // Include allocations if requested
    if (includeAllocations) {
      const allocations = await DatabaseService.getResourceAllocations();
      resources = resources.map(resource => ({
        ...resource,
        allocations: allocations.filter(allocation => allocation.resourceId === resource.id)
      }));
    }

    Logger.info('Resources fetched successfully', {
      userId: user.id,
      count: resources.length,
      filters: { department, status, search }
    });

    return res.json(resources);
  } catch (error) {
    Logger.error('Failed to fetch resources', error, { userId: user.id });
    return createErrorResponse(res, 500, 'Failed to fetch resources');
  }
};

// Export with middleware
module.exports = withMiddleware(resourcesHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: resourcesQuerySchema
});
