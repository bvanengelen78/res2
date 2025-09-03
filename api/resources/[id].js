// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema for resource detail query
const resourceDetailQuerySchema = z.object({
  includeAllocations: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(true),
  includeMetrics: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false),
  includeTimeEntries: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false)
});

// Schema for updating resources
const updateResourceSchema = z.object({
  name: z.string().min(1, 'Resource name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  weeklyCapacity: z.number().min(0, 'Weekly capacity must be non-negative').optional(),
  skills: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

// Get resource with optional allocations and metrics
const getResourceWithDetails = async (resourceId, includeAllocations = true, includeMetrics = false) => {
  try {
    // Fetch basic resource data
    const resources = await DatabaseService.getResources();
    
    if (!resources || !Array.isArray(resources)) {
      Logger.warn('Invalid resources data received from database', { resourceId, resourcesType: typeof resources });
      return null;
    }

    const resource = resources.find(r => r.id === resourceId);

    if (!resource) {
      Logger.info('Resource not found in database', { resourceId, availableResources: resources.length });
      return null;
    }
    
    // Start with basic resource data
    let responseData = { ...resource };
    
    // Only fetch additional data if requested
    if (includeAllocations || includeMetrics) {
      const [allocations, projects] = await Promise.all([
        DatabaseService.getResourceAllocations(),
        DatabaseService.getProjects()
      ]);

      if (!allocations || !Array.isArray(allocations)) {
        Logger.warn('Invalid allocations data received from database', { resourceId, allocationsType: typeof allocations });
        if (includeAllocations) responseData.allocations = [];
        if (includeMetrics) responseData.metrics = null;
        return responseData;
      }

      if (!projects || !Array.isArray(projects)) {
        Logger.warn('Invalid projects data received from database', { resourceId, projectsType: typeof projects });
        if (includeAllocations) responseData.allocations = [];
        if (includeMetrics) responseData.metrics = null;
        return responseData;
      }

      const resourceAllocations = allocations.filter(allocation => allocation.resourceId === resourceId);
      
      if (includeAllocations) {
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
              priority: project.priority
            } : null
          };
        });
        responseData.allocations = enrichedAllocations;
      }
      
      if (includeMetrics) {
        // Calculate resource metrics
        const totalAllocatedHours = resourceAllocations.reduce((sum, allocation) => {
          return sum + (parseFloat(allocation.allocatedHours) || 0);
        }, 0);
        
        const activeAllocations = resourceAllocations.filter(allocation => allocation.status === 'active');
        const weeklyCapacity = resource.weeklyCapacity || 40;
        
        responseData.metrics = {
          totalAllocatedHours,
          activeAllocationsCount: activeAllocations.length,
          weeklyCapacity,
          utilizationPercentage: weeklyCapacity > 0 ? (totalAllocatedHours / weeklyCapacity) * 100 : 0
        };
      }
    }
    
    return responseData;
  } catch (error) {
    Logger.error('Failed to fetch resource with details', error, { resourceId });
    throw error;
  }
};

// Main resource detail handler (GET)
const resourceDetailHandler = async (req, res, { user, validatedData }) => {
  const { includeAllocations, includeMetrics, includeTimeEntries } = validatedData;
  
  // Extract resource ID from URL path
  const resourceId = parseInt(req.query.id);
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided', {
      resourceId: req.query.id,
      parsedId: resourceId,
      userId: user.id,
      url: req.url
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }
  
  Logger.info('Fetching resource detail', {
    userId: user.id,
    resourceId,
    includeAllocations,
    includeMetrics,
    includeTimeEntries
  });
  
  try {
    // Fetch resource with optional details
    const resource = await getResourceWithDetails(resourceId, includeAllocations, includeMetrics);
    
    if (!resource) {
      Logger.warn('Resource not found', { resourceId, userId: user.id });
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    // TODO: Include time entries if requested (when time entries table is available)
    if (includeTimeEntries) {
      resource.timeEntries = [];
    }
    
    Logger.info('Resource detail fetched successfully', {
      userId: user.id,
      resourceId,
      hasAllocations: !!resource.allocations,
      hasMetrics: !!resource.metrics,
      allocationsCount: resource.allocations?.length || 0
    });
    
    return res.json(resource);
    
  } catch (error) {
    Logger.error('Failed to fetch resource detail', error, { userId: user.id, resourceId });
    return res.status(500).json({ message: 'Failed to fetch resource details' });
  }
};

// Update resource handler (PUT)
const updateResourceHandler = async (req, res, { user, validatedData }) => {
  const resourceId = parseInt(req.query.id);
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided for update', { 
      resourceId: req.query.id, 
      parsedId: resourceId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }

  Logger.info('Updating resource', {
    userId: user.id,
    resourceId,
    data: validatedData
  });

  try {
    // Use Supabase client directly for update
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First check if resource exists
    const { data: existingResource, error: fetchError } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .single();

    if (fetchError || !existingResource) {
      Logger.warn('Resource not found for update', { 
        resourceId, 
        userId: user.id,
        error: fetchError?.message 
      });
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Prepare update data
    const updateData = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    if (validatedData.department !== undefined) updateData.department = validatedData.department;
    if (validatedData.weeklyCapacity !== undefined) updateData.weekly_capacity = validatedData.weeklyCapacity;
    if (validatedData.skills !== undefined) updateData.skills = validatedData.skills;
    if (validatedData.isActive !== undefined) updateData.is_active = validatedData.isActive;

    const { data, error } = await supabase
      .from('resources')
      .update(updateData)
      .eq('id', resourceId)
      .select()
      .single();

    if (error) {
      Logger.error('Failed to update resource in database', error, {
        userId: user.id,
        resourceId,
        data: validatedData
      });
      throw new Error(`Database error: ${error.message}`);
    }

    // Convert to camelCase for response
    const resource = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      department: data.department,
      weeklyCapacity: data.weekly_capacity,
      skills: data.skills,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    Logger.info('Resource updated successfully', {
      userId: user.id,
      resourceId: resource.id,
      resourceName: resource.name
    });

    return res.json(resource);
  } catch (error) {
    Logger.error('Failed to update resource', error, { userId: user.id, resourceId });
    return res.status(500).json({ message: 'Failed to update resource' });
  }
};

// Delete resource handler (DELETE)
const deleteResourceHandler = async (req, res, { user }) => {
  const resourceId = parseInt(req.query.id);
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided for deletion', { 
      resourceId: req.query.id, 
      parsedId: resourceId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }

  Logger.info('Deleting resource', {
    userId: user.id,
    resourceId
  });

  try {
    // Use Supabase client directly for deletion
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First check if resource exists
    const { data: existingResource, error: fetchError } = await supabase
      .from('resources')
      .select('id, name')
      .eq('id', resourceId)
      .single();

    if (fetchError || !existingResource) {
      Logger.warn('Resource not found for deletion', { 
        resourceId, 
        userId: user.id,
        error: fetchError?.message 
      });
      return res.status(404).json({ message: 'Resource not found' });
    }

    // Soft delete by setting is_active to false and is_deleted to true
    const { error } = await supabase
      .from('resources')
      .update({ 
        is_active: false, 
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', resourceId);

    if (error) {
      Logger.error('Failed to delete resource from database', error, {
        userId: user.id,
        resourceId
      });
      throw new Error(`Database error: ${error.message}`);
    }

    Logger.info('Resource deleted successfully', {
      userId: user.id,
      resourceId,
      resourceName: existingResource.name
    });

    return res.status(204).send();
  } catch (error) {
    Logger.error('Failed to delete resource', error, { userId: user.id, resourceId });
    return res.status(500).json({ message: 'Failed to delete resource' });
  }
};

// Main handler that routes based on HTTP method
const resourceMainHandler = async (req, res, context) => {
  const { method } = req;
  
  switch (method) {
    case 'GET':
      return resourceDetailHandler(req, res, context);
    case 'PUT':
      // Validate with update schema
      const updateValidation = updateResourceSchema.safeParse(req.body);
      if (!updateValidation.success) {
        Logger.warn('Invalid resource data for update', { 
          errors: updateValidation.error.errors,
          userId: context.user?.id 
        });
        return res.status(400).json({ 
          message: 'Invalid resource data', 
          errors: updateValidation.error.errors 
        });
      }
      return updateResourceHandler(req, res, { 
        ...context, 
        validatedData: updateValidation.data 
      });
    case 'DELETE':
      return deleteResourceHandler(req, res, context);
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
};

// Export with middleware - Demo mode: no authentication required
module.exports = withMiddleware(resourceMainHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET', 'PUT', 'DELETE'],
  validateSchema: resourceDetailQuerySchema // Only for GET requests
});
