// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schemas
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

// Schema for updating projects
const updateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'on-hold', 'cancelled']).optional(),
  startDate: z.string().min(1, 'Start date is required').optional(),
  endDate: z.string().min(1, 'End date is required').optional(),
  estimatedHours: z.number().min(0, 'Estimated hours must be non-negative').optional(),
  department: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  ogsmCharterId: z.number().int().positive().optional()
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

// Get project with optional allocations and metrics
const getProjectWithDetails = async (projectId, includeAllocations = false, includeMetrics = false) => {
  try {
    // Fetch project from Supabase
    const projects = await DatabaseService.getProjects();

    if (!projects || !Array.isArray(projects)) {
      Logger.warn('Invalid projects data received from database', { projectId, projectsType: typeof projects });
      return null;
    }

    const project = projects.find(p => p.id === projectId);

    if (!project) {
      Logger.info('Project not found in database', { projectId, availableProjects: projects.length });
      return null;
    }

    // Start with basic project data
    let responseData = { ...project };

    // Only fetch additional data if requested
    if (includeAllocations || includeMetrics) {
      const [allocations, resources] = await Promise.all([
        DatabaseService.getResourceAllocations(),
        DatabaseService.getResources()
      ]);

      if (!allocations || !Array.isArray(allocations)) {
        Logger.warn('Invalid allocations data received from database', { projectId, allocationsType: typeof allocations });
        if (includeAllocations) responseData.allocations = [];
        if (includeMetrics) responseData.metrics = null;
        return responseData;
      }

      if (!resources || !Array.isArray(resources)) {
        Logger.warn('Invalid resources data received from database', { projectId, resourcesType: typeof resources });
        if (includeAllocations) responseData.allocations = [];
        if (includeMetrics) responseData.metrics = null;
        return responseData;
      }

      const projectAllocations = allocations.filter(allocation => allocation.projectId === projectId);

      if (includeAllocations) {
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
        responseData.allocations = enrichedAllocations;
      }

      if (includeMetrics) {
        responseData.metrics = calculateProjectMetrics(project, allocations, resources);
      }
    }

    return responseData;
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

  if (isNaN(projectId) || projectId <= 0) {
    Logger.warn('Invalid project ID provided', {
      projectId: req.query.id,
      parsedId: projectId,
      userId: user.id,
      url: req.url
    });
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
    // Fetch project with optional details
    const project = await getProjectWithDetails(projectId, includeAllocations, includeMetrics);

    if (!project) {
      Logger.warn('Project not found', { projectId, userId: user.id });
      return res.status(404).json({ message: 'Project not found' });
    }

    // TODO: Include time entries if requested (when time entries table is available)
    if (includeTimeEntries) {
      project.timeEntries = [];
    }
    
    Logger.info('Project detail fetched successfully', {
      userId: user.id,
      projectId,
      hasAllocations: !!project.allocations,
      hasMetrics: !!project.metrics,
      allocationsCount: project.allocations?.length || 0
    });

    return res.json(project);

  } catch (error) {
    Logger.error('Failed to fetch project detail', error, { userId: user.id, projectId });
    return res.status(500).json({ message: 'Failed to fetch project details' });
  }
};

// Update project handler
const updateProjectHandler = async (req, res, { user, validatedData }) => {
  const projectId = parseInt(req.query.id);

  if (isNaN(projectId) || projectId <= 0) {
    Logger.warn('Invalid project ID provided for update', {
      projectId: req.query.id,
      parsedId: projectId,
      userId: user.id,
      url: req.url
    });
    return res.status(400).json({ message: 'Invalid project ID provided' });
  }

  Logger.info('Updating project', {
    userId: user.id,
    projectId,
    data: validatedData
  });

  try {
    // Use Supabase client directly for update
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First check if project exists
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProject) {
      Logger.warn('Project not found for update', {
        projectId,
        userId: user.id,
        error: fetchError?.message
      });
      return res.status(404).json({ message: 'Project not found' });
    }

    // Prepare update data
    const updateData = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.startDate !== undefined) updateData.start_date = validatedData.startDate;
    if (validatedData.endDate !== undefined) updateData.end_date = validatedData.endDate;
    if (validatedData.estimatedHours !== undefined) updateData.estimated_hours = validatedData.estimatedHours;
    if (validatedData.department !== undefined) updateData.department = validatedData.department;
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
    if (validatedData.ogsmCharterId !== undefined) updateData.ogsm_charter_id = validatedData.ogsmCharterId;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      Logger.error('Failed to update project in database', error, {
        userId: user.id,
        projectId,
        data: validatedData
      });
      throw new Error(`Database error: ${error.message}`);
    }

    // Convert to camelCase for response
    const project = {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      estimatedHours: data.estimated_hours,
      department: data.department,
      priority: data.priority,
      ogsmCharterId: data.ogsm_charter_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    Logger.info('Project updated successfully', {
      userId: user.id,
      projectId: project.id,
      projectName: project.name
    });

    return res.json(project);
  } catch (error) {
    Logger.error('Failed to update project', error, { userId: user.id, projectId });
    return res.status(500).json({ message: 'Failed to update project' });
  }
};

// Delete project handler
const deleteProjectHandler = async (req, res, { user }) => {
  const projectId = parseInt(req.query.id);

  if (isNaN(projectId) || projectId <= 0) {
    Logger.warn('Invalid project ID provided for deletion', {
      projectId: req.query.id,
      parsedId: projectId,
      userId: user.id,
      url: req.url
    });
    return res.status(400).json({ message: 'Invalid project ID provided' });
  }

  Logger.info('Deleting project', {
    userId: user.id,
    projectId
  });

  try {
    // Use Supabase client directly for deletion
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First check if project exists
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProject) {
      Logger.warn('Project not found for deletion', {
        projectId,
        userId: user.id,
        error: fetchError?.message
      });
      return res.status(404).json({ message: 'Project not found' });
    }

    // Delete the project (this will cascade to related allocations if configured)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      Logger.error('Failed to delete project from database', error, {
        userId: user.id,
        projectId
      });
      throw new Error(`Database error: ${error.message}`);
    }

    Logger.info('Project deleted successfully', {
      userId: user.id,
      projectId,
      projectName: existingProject.name
    });

    return res.status(204).send();
  } catch (error) {
    Logger.error('Failed to delete project', error, { userId: user.id, projectId });
    return res.status(500).json({ message: 'Failed to delete project' });
  }
};

// Main handler that routes based on HTTP method
const projectMainHandler = async (req, res, context) => {
  const { method } = req;

  switch (method) {
    case 'GET':
      return projectDetailHandler(req, res, context);
    case 'PUT':
      // Validate with update schema
      const updateValidation = updateProjectSchema.safeParse(req.body);
      if (!updateValidation.success) {
        Logger.warn('Invalid project data for update', {
          errors: updateValidation.error.errors,
          userId: context.user?.id
        });
        return res.status(400).json({
          message: 'Invalid project data',
          errors: updateValidation.error.errors
        });
      }
      return updateProjectHandler(req, res, {
        ...context,
        validatedData: updateValidation.data
      });
    case 'DELETE':
      return deleteProjectHandler(req, res, context);
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
};

// Export with middleware
module.exports = withMiddleware(projectMainHandler, {
  requireAuth: true,
  allowedMethods: ['GET', 'PUT', 'DELETE'],
  validateSchema: projectDetailQuerySchema // Only for GET requests
});
