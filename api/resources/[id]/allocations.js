// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../../lib/middleware');
const { DatabaseService } = require('../../lib/supabase');

// Input validation schema for resource allocations query
const resourceAllocationsQuerySchema = z.object({
  includeProjects: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(true),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

// Get resource allocations with enriched project information
const getResourceAllocationsWithProjects = async (resourceId, includeProjects = true, status = 'active', startDate = null, endDate = null) => {
  try {
    // Fetch allocations and projects
    const [allocations, projects] = await Promise.all([
      DatabaseService.getResourceAllocations(),
      includeProjects ? DatabaseService.getProjects() : Promise.resolve([])
    ]);

    if (!allocations || !Array.isArray(allocations)) {
      Logger.warn('Invalid allocations data received from database', { resourceId, allocationsType: typeof allocations });
      return [];
    }

    // Filter allocations for this resource
    let resourceAllocations = allocations.filter(allocation => allocation.resourceId === resourceId);
    
    // Apply status filter if specified
    if (status !== 'all') {
      resourceAllocations = resourceAllocations.filter(allocation => allocation.status === status);
    }
    
    // Apply date range filter if specified
    if (startDate && endDate) {
      resourceAllocations = resourceAllocations.filter(allocation => {
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        const filterStart = new Date(startDate);
        const filterEnd = new Date(endDate);
        
        // Check if allocation overlaps with the date range
        return allocationStart <= filterEnd && allocationEnd >= filterStart;
      });
    }
    
    if (includeProjects && projects && Array.isArray(projects)) {
      // Enrich allocations with project information
      const enrichedAllocations = resourceAllocations.map(allocation => {
        const project = projects.find(p => p.id === allocation.projectId);
        return {
          ...allocation,
          project: project ? {
            id: project.id,
            name: project.name,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            department: project.department,
            priority: project.priority,
            description: project.description
          } : null
        };
      });
      
      Logger.info('Resource allocations with projects fetched successfully', {
        resourceId,
        allocationsCount: enrichedAllocations.length,
        projectsCount: projects.length,
        status,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'all'
      });
      
      return enrichedAllocations;
    } else {
      Logger.info('Resource allocations fetched successfully', {
        resourceId,
        allocationsCount: resourceAllocations.length,
        status,
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'all'
      });
      
      return resourceAllocations;
    }
  } catch (error) {
    Logger.error('Failed to fetch resource allocations with projects', error, { resourceId });
    throw error;
  }
};

// Main resource allocations handler
const resourceAllocationsHandler = async (req, res, { user, validatedData }) => {
  const { includeProjects, status, startDate, endDate } = validatedData;
  
  // Extract resource ID from URL path
  const resourceId = parseInt(req.query.id);
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided for allocations', { 
      resourceId: req.query.id, 
      parsedId: resourceId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }
  
  Logger.info('Fetching resource allocations', {
    userId: user.id,
    resourceId,
    includeProjects,
    status,
    startDate,
    endDate
  });
  
  try {
    // First verify the resource exists
    const resources = await DatabaseService.getResources();
    const resource = resources.find(r => r.id === resourceId);
    
    if (!resource) {
      Logger.warn('Resource not found for allocations query', { resourceId, userId: user.id });
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    const allocations = await getResourceAllocationsWithProjects(
      resourceId, 
      includeProjects, 
      status, 
      startDate, 
      endDate
    );
    
    Logger.info('Resource allocations fetched successfully', {
      userId: user.id,
      resourceId,
      allocationsCount: allocations.length,
      hasProjectData: includeProjects
    });
    
    return res.json(allocations);
    
  } catch (error) {
    Logger.error('Failed to fetch resource allocations', error, { userId: user.id, resourceId });
    return res.status(500).json({ message: 'Failed to fetch resource allocations' });
  }
};

// Export with middleware - Demo mode: no authentication required
module.exports = withMiddleware(resourceAllocationsHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: resourceAllocationsQuerySchema
});
