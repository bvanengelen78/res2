// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../../lib/middleware');
const { DatabaseService } = require('../../lib/supabase');

// Input validation schema for resource relationships query
const resourceRelationshipsQuerySchema = z.object({
  includeDetails: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(true)
});

// Get resource relationships (allocations, time entries, etc.)
const getResourceRelationships = async (resourceId, includeDetails = true) => {
  try {
    Logger.info('Fetching resource relationships', { resourceId, includeDetails });

    // Fetch all related data
    const [allocations, projects] = await Promise.all([
      DatabaseService.getResourceAllocations(),
      DatabaseService.getProjects()
    ]);

    if (!allocations || !Array.isArray(allocations)) {
      Logger.warn('Invalid allocations data received from database', { resourceId, allocationsType: typeof allocations });
      return { allocations: [], projects: [], timeEntries: [], canDelete: true, warnings: [] };
    }

    if (!projects || !Array.isArray(projects)) {
      Logger.warn('Invalid projects data received from database', { resourceId, projectsType: typeof projects });
      return { allocations: [], projects: [], timeEntries: [], canDelete: true, warnings: [] };
    }

    // Filter allocations for this resource
    const resourceAllocations = allocations.filter(allocation => allocation.resourceId === resourceId);
    
    // Get unique projects this resource is allocated to
    const projectIds = [...new Set(resourceAllocations.map(allocation => allocation.projectId))];
    const relatedProjects = projects.filter(project => projectIds.includes(project.id));
    
    // Determine if resource can be safely deleted
    const activeAllocations = resourceAllocations.filter(allocation => allocation.status === 'active');
    const activeProjects = relatedProjects.filter(project => project.status === 'active');
    
    const canDelete = activeAllocations.length === 0 && activeProjects.length === 0;
    
    // Generate warnings for deletion
    const warnings = [];
    if (activeAllocations.length > 0) {
      warnings.push(`Resource has ${activeAllocations.length} active allocation(s)`);
    }
    if (activeProjects.length > 0) {
      warnings.push(`Resource is allocated to ${activeProjects.length} active project(s)`);
    }
    
    const relationships = {
      allocations: includeDetails ? resourceAllocations.map(allocation => {
        const project = projects.find(p => p.id === allocation.projectId);
        return {
          ...allocation,
          project: project ? {
            id: project.id,
            name: project.name,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate
          } : null
        };
      }) : resourceAllocations,
      projects: includeDetails ? relatedProjects : relatedProjects.map(p => ({ id: p.id, name: p.name, status: p.status })),
      timeEntries: [], // TODO: Add time entries when available
      canDelete,
      warnings,
      summary: {
        totalAllocations: resourceAllocations.length,
        activeAllocations: activeAllocations.length,
        totalProjects: relatedProjects.length,
        activeProjects: activeProjects.length
      }
    };

    Logger.info('Resource relationships fetched successfully', {
      resourceId,
      totalAllocations: resourceAllocations.length,
      activeAllocations: activeAllocations.length,
      totalProjects: relatedProjects.length,
      activeProjects: activeProjects.length,
      canDelete
    });

    return relationships;
  } catch (error) {
    Logger.error('Failed to fetch resource relationships', error, { resourceId });
    throw error;
  }
};

// Main resource relationships handler
const resourceRelationshipsHandler = async (req, res, { user, validatedData }) => {
  const { includeDetails } = validatedData;
  
  // Extract resource ID from URL path
  const resourceId = parseInt(req.query.id);
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided for relationships', { 
      resourceId: req.query.id, 
      parsedId: resourceId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }
  
  Logger.info('Fetching resource relationships', {
    userId: user.id,
    resourceId,
    includeDetails
  });
  
  try {
    // First verify the resource exists
    const resources = await DatabaseService.getResources();
    const resource = resources.find(r => r.id === resourceId);
    
    if (!resource) {
      Logger.warn('Resource not found for relationships query', { resourceId, userId: user.id });
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    const relationships = await getResourceRelationships(resourceId, includeDetails);
    
    Logger.info('Resource relationships fetched successfully', {
      userId: user.id,
      resourceId,
      canDelete: relationships.canDelete,
      warningsCount: relationships.warnings.length
    });
    
    return res.json(relationships);
    
  } catch (error) {
    Logger.error('Failed to fetch resource relationships', error, { userId: user.id, resourceId });
    return res.status(500).json({ message: 'Failed to fetch resource relationships' });
  }
};

// Export with middleware
module.exports = withMiddleware(resourceRelationshipsHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: resourceRelationshipsQuerySchema
});
