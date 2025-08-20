// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../../lib/middleware');
const { DatabaseService } = require('../../lib/supabase');

// Input validation schema for project allocations query
const projectAllocationsQuerySchema = z.object({
  includeResources: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(true),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active')
});

// Get project allocations with enriched resource information
const getProjectAllocationsWithResources = async (projectId) => {
  try {
    // Fetch allocations and resources
    const [allocations, resources] = await Promise.all([
      DatabaseService.getResourceAllocations(),
      DatabaseService.getResources()
    ]);

    if (!allocations || !Array.isArray(allocations)) {
      Logger.warn('Invalid allocations data received from database', { projectId, allocationsType: typeof allocations });
      return [];
    }

    if (!resources || !Array.isArray(resources)) {
      Logger.warn('Invalid resources data received from database', { projectId, resourcesType: typeof resources });
      return [];
    }

    // Filter allocations for this project
    const projectAllocations = allocations.filter(allocation => allocation.projectId === projectId);
    
    // Enrich allocations with resource information
    const enrichedAllocations = projectAllocations.map(allocation => {
      const resource = resources.find(r => r.id === allocation.resourceId);
      return {
        ...allocation,
        resource: resource ? {
          id: resource.id,
          name: resource.name,
          email: resource.email,
          role: resource.role,
          department: resource.department,
          weeklyCapacity: resource.weeklyCapacity || 40
        } : null
      };
    });

    Logger.info('Project allocations fetched successfully', {
      projectId,
      allocationsCount: enrichedAllocations.length,
      resourcesCount: resources.length
    });

    return enrichedAllocations;
  } catch (error) {
    Logger.error('Failed to fetch project allocations with resources', error, { projectId });
    throw error;
  }
};

// Main project allocations handler
const projectAllocationsHandler = async (req, res, { user, validatedData }) => {
  const { includeResources, status } = validatedData;
  
  // Extract project ID from URL path
  const projectId = parseInt(req.query.id);
  
  if (isNaN(projectId) || projectId <= 0) {
    Logger.warn('Invalid project ID provided for allocations', { 
      projectId: req.query.id, 
      parsedId: projectId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid project ID provided' });
  }
  
  Logger.info('Fetching project allocations', {
    userId: user.id,
    projectId,
    includeResources,
    status
  });
  
  try {
    let allocations;
    
    if (includeResources) {
      allocations = await getProjectAllocationsWithResources(projectId);
    } else {
      // Just get basic allocations without resource enrichment
      const allAllocations = await DatabaseService.getResourceAllocations();
      allocations = allAllocations.filter(allocation => allocation.projectId === projectId);
    }
    
    // Apply status filter if specified
    if (status !== 'all') {
      allocations = allocations.filter(allocation => allocation.status === status);
    }
    
    Logger.info('Project allocations fetched successfully', {
      userId: user.id,
      projectId,
      allocationsCount: allocations.length,
      hasResourceData: includeResources
    });
    
    return res.json(allocations);
    
  } catch (error) {
    Logger.error('Failed to fetch project allocations', error, { userId: user.id, projectId });
    return res.status(500).json({ message: 'Failed to fetch project allocations' });
  }
};

// Export with middleware
module.exports = withMiddleware(projectAllocationsHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: projectAllocationsQuerySchema
});
