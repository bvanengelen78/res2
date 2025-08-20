// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../../lib/middleware');
const { DatabaseService } = require('../../lib/supabase');

// Input validation schema for weekly allocation updates
const weeklyAllocationUpdateSchema = z.object({
  resourceId: z.number().int().positive('Resource ID must be a positive integer'),
  weekKey: z.string().min(1, 'Week key is required'),
  hours: z.number().min(0, 'Hours must be non-negative').max(168, 'Hours cannot exceed 168 per week')
});

// Update weekly allocation for a project
const updateProjectWeeklyAllocation = async (projectId, resourceId, weekKey, hours) => {
  try {
    Logger.info('Updating project weekly allocation', {
      projectId,
      resourceId,
      weekKey,
      hours
    });

    // First, get all allocations to find the specific allocation
    const allocations = await DatabaseService.getResourceAllocations();
    
    if (!allocations || !Array.isArray(allocations)) {
      throw new Error('Failed to fetch allocations from database');
    }

    // Find the allocation for this project and resource
    const allocation = allocations.find(a => 
      a.projectId === projectId && a.resourceId === resourceId
    );

    if (!allocation) {
      throw new Error(`No allocation found for project ${projectId} and resource ${resourceId}`);
    }

    // Get current weekly allocations or initialize empty object
    const currentWeeklyAllocations = allocation.weeklyAllocations || {};
    
    // Update the specific week
    const updatedWeeklyAllocations = {
      ...currentWeeklyAllocations,
      [weekKey]: hours
    };

    // Calculate total allocated hours from all weeks
    const totalAllocatedHours = Object.values(updatedWeeklyAllocations)
      .reduce((sum, weekHours) => sum + (weekHours || 0), 0);

    // Update the allocation in the database
    // Note: This would typically use a direct database update, but we'll use the storage layer
    const updateData = {
      weeklyAllocations: updatedWeeklyAllocations,
      allocatedHours: totalAllocatedHours.toString()
    };

    // Since we don't have direct access to storage.updateResourceAllocation in this context,
    // we'll need to use the Supabase client directly
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('resource_allocations')
      .update({
        weekly_allocations: updatedWeeklyAllocations,
        allocated_hours: totalAllocatedHours.toString()
      })
      .eq('id', allocation.id)
      .select()
      .single();

    if (error) {
      Logger.error('Failed to update weekly allocation in database', error, {
        projectId,
        resourceId,
        weekKey,
        hours,
        allocationId: allocation.id
      });
      throw new Error(`Database error: ${error.message}`);
    }

    Logger.info('Weekly allocation updated successfully', {
      projectId,
      resourceId,
      weekKey,
      hours,
      allocationId: allocation.id,
      totalAllocatedHours
    });

    // Return the updated allocation with camelCase conversion
    const updatedAllocation = {
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

    return updatedAllocation;
  } catch (error) {
    Logger.error('Failed to update project weekly allocation', error, {
      projectId,
      resourceId,
      weekKey,
      hours
    });
    throw error;
  }
};

// Main weekly allocation handler
const weeklyAllocationHandler = async (req, res, { user, validatedData }) => {
  const { resourceId, weekKey, hours } = validatedData;
  
  // Extract project ID from URL path
  const projectId = parseInt(req.query.id);
  
  if (isNaN(projectId) || projectId <= 0) {
    Logger.warn('Invalid project ID provided for weekly allocation', { 
      projectId: req.query.id, 
      parsedId: projectId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid project ID provided' });
  }
  
  Logger.info('Processing weekly allocation update', {
    userId: user.id,
    projectId,
    resourceId,
    weekKey,
    hours
  });
  
  try {
    const updatedAllocation = await updateProjectWeeklyAllocation(
      projectId,
      resourceId,
      weekKey,
      hours
    );
    
    Logger.info('Weekly allocation update completed successfully', {
      userId: user.id,
      projectId,
      resourceId,
      weekKey,
      hours,
      allocationId: updatedAllocation.id
    });
    
    return res.json(updatedAllocation);
    
  } catch (error) {
    Logger.error('Failed to process weekly allocation update', error, {
      userId: user.id,
      projectId,
      resourceId,
      weekKey,
      hours
    });
    
    // Return appropriate error status based on error type
    if (error.message.includes('No allocation found')) {
      return res.status(404).json({ message: 'Allocation not found for this project and resource' });
    }
    
    return res.status(500).json({ message: 'Failed to update weekly allocation' });
  }
};

// Export with middleware
module.exports = withMiddleware(weeklyAllocationHandler, {
  requireAuth: true,
  allowedMethods: ['PUT'],
  validateSchema: weeklyAllocationUpdateSchema
});
