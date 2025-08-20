// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema for project detail query
const projectDetailQuerySchema = z.object({
  includeAllocations: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false),
  includeMetrics: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false),
  includeTimeEntries: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false)
});

// Calculate project metrics from allocations and resources
const calculateProjectMetrics = (project, allocations, resources) => {
  const projectAllocations = allocations.filter(allocation => allocation.projectId === project.id);
  
  const totalAllocatedHours = projectAllocations.reduce((sum, allocation) => sum + (allocation.allocatedHours || 0), 0);
  const totalResources = projectAllocations.length;
  const uniqueResources = new Set(projectAllocations.map(allocation => allocation.resourceId)).size;
  
  // Calculate utilization based on project timeline
  let utilizationPercentage = 0;
  if (project.estimatedHours && project.estimatedHours > 0) {
    utilizationPercentage = (totalAllocatedHours / project.estimatedHours) * 100;
  }
  
  // Calculate progress based on current date vs project timeline
  let progressPercentage = 0;
  if (project.startDate && project.endDate) {
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);
    const currentDate = new Date();
    
    if (currentDate >= startDate && currentDate <= endDate) {
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsedDuration = currentDate.getTime() - startDate.getTime();
      progressPercentage = Math.min(100, (elapsedDuration / totalDuration) * 100);
    } else if (currentDate > endDate) {
      progressPercentage = 100;
    }
  }
  
  return {
    totalAllocatedHours,
    totalResources,
    uniqueResources,
    utilizationPercentage: Math.round(utilizationPercentage * 10) / 10,
    progressPercentage: Math.round(progressPercentage * 10) / 10,
    estimatedHours: project.estimatedHours || 0,
    status: project.status || 'active'
  };
};

// Get project with allocations (similar to storage.getProjectWithAllocations)
const getProjectWithAllocations = async (projectId) => {
  try {
    // Fetch project from Supabase
    const projects = await DatabaseService.getProjects();
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return null;
    }
    
    // Fetch allocations for this project
    const [allocations, resources] = await Promise.all([
      DatabaseService.getResourceAllocations(),
      DatabaseService.getResources()
    ]);
    
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
    
    return {
      ...project,
      allocations: enrichedAllocations,
      metrics: calculateProjectMetrics(project, allocations, resources)
    };
  } catch (error) {
    Logger.error('Failed to fetch project with allocations', error, { projectId });
    throw error;
  }
};

// Main project detail handler
const projectDetailHandler = async (req, res, { user, validatedData }) => {
  const { includeAllocations, includeMetrics, includeTimeEntries } = validatedData;
  
  // Extract project ID from URL path
  const projectId = parseInt(req.query.id);
  
  if (isNaN(projectId)) {
    Logger.warn('Invalid project ID provided', { projectId: req.query.id, userId: user.id });
    return res.status(400).json({ message: 'Invalid project ID provided' });
  }
  
  Logger.info('Fetching project detail', {
    userId: user.id,
    projectId,
    includeAllocations,
    includeMetrics,
    includeTimeEntries
  });
  
  try {
    // Fetch project with allocations
    const project = await getProjectWithAllocations(projectId);
    
    if (!project) {
      Logger.warn('Project not found', { projectId, userId: user.id });
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Prepare response data
    let responseData = { ...project };
    
    // Include allocations if not already included
    if (includeAllocations && !responseData.allocations) {
      const allocations = await DatabaseService.getResourceAllocations();
      responseData.allocations = allocations.filter(allocation => allocation.projectId === projectId);
    }
    
    // Include metrics if requested
    if (includeMetrics && !responseData.metrics) {
      const [allocations, resources] = await Promise.all([
        DatabaseService.getResourceAllocations(),
        DatabaseService.getResources()
      ]);
      responseData.metrics = calculateProjectMetrics(project, allocations, resources);
    }
    
    // TODO: Include time entries if requested (when time entries table is available)
    if (includeTimeEntries) {
      responseData.timeEntries = [];
    }
    
    Logger.info('Project detail fetched successfully', {
      userId: user.id,
      projectId,
      hasAllocations: !!responseData.allocations,
      hasMetrics: !!responseData.metrics,
      allocationsCount: responseData.allocations?.length || 0
    });
    
    return res.json(responseData);

  } catch (error) {
    Logger.error('Failed to fetch project detail', error, { userId: user.id, projectId });
    return res.status(500).json({ message: 'Failed to fetch project details' });
  }
};

// Export with middleware
module.exports = withMiddleware(projectDetailHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: projectDetailQuerySchema
});
