// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Schema for updating allocations
const updateAllocationSchema = z.object({
  projectId: z.number().int().positive('Project ID must be a positive integer').optional(),
  resourceId: z.number().int().positive('Resource ID must be a positive integer').optional(),
  allocatedHours: z.string().min(1, 'Allocated hours is required').optional(),
  startDate: z.string().min(1, 'Start date is required').optional(),
  endDate: z.string().min(1, 'End date is required').optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'planned', 'completed']).optional()
});

// Update allocation handler
const updateAllocationHandler = async (req, res, { user, validatedData }) => {
  const allocationId = parseInt(req.query.id);
  
  if (isNaN(allocationId) || allocationId <= 0) {
    Logger.warn('Invalid allocation ID provided for update', { 
      allocationId: req.query.id, 
      parsedId: allocationId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid allocation ID provided' });
  }

  Logger.info('Updating resource allocation', {
    userId: user.id,
    allocationId,
    data: validatedData
  });

  try {
    // Use Supabase client directly for update
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First check if allocation exists
    const { data: existingAllocation, error: fetchError } = await supabase
      .from('resource_allocations')
      .select('*')
      .eq('id', allocationId)
      .single();

    if (fetchError || !existingAllocation) {
      Logger.warn('Allocation not found for update', { 
        allocationId, 
        userId: user.id,
        error: fetchError?.message 
      });
      return res.status(404).json({ message: 'Allocation not found' });
    }

    // Prepare update data
    const updateData = {};
    if (validatedData.projectId !== undefined) updateData.project_id = validatedData.projectId;
    if (validatedData.resourceId !== undefined) updateData.resource_id = validatedData.resourceId;
    if (validatedData.allocatedHours !== undefined) updateData.allocated_hours = validatedData.allocatedHours;
    if (validatedData.startDate !== undefined) updateData.start_date = validatedData.startDate;
    if (validatedData.endDate !== undefined) updateData.end_date = validatedData.endDate;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const { data, error } = await supabase
      .from('resource_allocations')
      .update(updateData)
      .eq('id', allocationId)
      .select()
      .single();

    if (error) {
      Logger.error('Failed to update allocation in database', error, {
        userId: user.id,
        allocationId,
        data: validatedData
      });
      throw new Error(`Database error: ${error.message}`);
    }

    // Convert to camelCase for response
    const allocation = {
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

    Logger.info('Allocation updated successfully', {
      userId: user.id,
      allocationId: allocation.id,
      projectId: allocation.projectId,
      resourceId: allocation.resourceId
    });

    return res.json(allocation);
  } catch (error) {
    Logger.error('Failed to update allocation', error, { userId: user.id, allocationId });
    return res.status(500).json({ message: 'Failed to update allocation' });
  }
};

// Delete allocation handler
const deleteAllocationHandler = async (req, res, { user }) => {
  const allocationId = parseInt(req.query.id);
  
  if (isNaN(allocationId) || allocationId <= 0) {
    Logger.warn('Invalid allocation ID provided for deletion', { 
      allocationId: req.query.id, 
      parsedId: allocationId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid allocation ID provided' });
  }

  Logger.info('Deleting resource allocation', {
    userId: user.id,
    allocationId
  });

  try {
    // Use Supabase client directly for deletion
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First check if allocation exists
    const { data: existingAllocation, error: fetchError } = await supabase
      .from('resource_allocations')
      .select('id, project_id, resource_id')
      .eq('id', allocationId)
      .single();

    if (fetchError || !existingAllocation) {
      Logger.warn('Allocation not found for deletion', { 
        allocationId, 
        userId: user.id,
        error: fetchError?.message 
      });
      return res.status(404).json({ message: 'Allocation not found' });
    }

    const { error } = await supabase
      .from('resource_allocations')
      .delete()
      .eq('id', allocationId);

    if (error) {
      Logger.error('Failed to delete allocation from database', error, {
        userId: user.id,
        allocationId
      });
      throw new Error(`Database error: ${error.message}`);
    }

    Logger.info('Allocation deleted successfully', {
      userId: user.id,
      allocationId,
      projectId: existingAllocation.project_id,
      resourceId: existingAllocation.resource_id
    });

    return res.status(204).send();
  } catch (error) {
    Logger.error('Failed to delete allocation', error, { userId: user.id, allocationId });
    return res.status(500).json({ message: 'Failed to delete allocation' });
  }
};

// Main handler that routes based on HTTP method
const allocationMainHandler = async (req, res, context) => {
  const { method } = req;
  
  switch (method) {
    case 'PUT':
      // Validate with update schema
      const updateValidation = updateAllocationSchema.safeParse(req.body);
      if (!updateValidation.success) {
        Logger.warn('Invalid allocation data for update', { 
          errors: updateValidation.error.errors,
          userId: context.user?.id 
        });
        return res.status(400).json({ 
          message: 'Invalid allocation data', 
          errors: updateValidation.error.errors 
        });
      }
      return updateAllocationHandler(req, res, { 
        ...context, 
        validatedData: updateValidation.data 
      });
    case 'DELETE':
      return deleteAllocationHandler(req, res, context);
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
};

// Export with middleware
module.exports = withMiddleware(allocationMainHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['PUT', 'DELETE']
});
