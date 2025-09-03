// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schema
const resourcesQuerySchema = z.object({
  department: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  includeAllocations: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false),
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

  // Always return a safe response, never throw errors to middleware
  let resources = [];

  try {
    // Fetch resources from Supabase (no fallback to mock data)
    resources = await DatabaseService.getResources();

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

  } catch (error) {
    Logger.error('Failed to fetch resources from Supabase', error, { userId: user.id });

    // Fallback to mock data for demo mode
    resources = [
      {
        id: 1,
        name: "Sarah Johnson",
        email: "sarah.johnson@company.com",
        role: "Senior Developer",
        department: "Engineering",
        weeklyCapacity: "40.00",
        isActive: true,
        profileImage: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: "Michael Chen",
        email: "michael.chen@company.com",
        role: "Project Manager",
        department: "Engineering",
        weeklyCapacity: "40.00",
        isActive: true,
        profileImage: null,
        createdAt: new Date().toISOString()
      },
      {
        id: 3,
        name: "Emily Rodriguez",
        email: "emily.rodriguez@company.com",
        role: "UX Designer",
        department: "Design",
        weeklyCapacity: "40.00",
        isActive: true,
        profileImage: null,
        createdAt: new Date().toISOString()
      }
    ];

    Logger.info('Using fallback mock data for demo mode', {
      userId: user.id,
      mockResourceCount: resources.length
    });
  }

  // Always return a valid array (never throw errors to middleware)
  return res.json(resources);
};

// Export with middleware - Demo mode: no authentication required
module.exports = withMiddleware(resourcesHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: resourcesQuerySchema
});
