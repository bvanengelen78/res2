// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../lib/supabase');

// CORS helper
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log(`[ALLOCATION_DETAIL] ${req.method} request to /api/allocations/[id]`);

    // Extract allocation ID from URL
    const { id } = req.query;
    const allocationId = parseInt(id);

    if (!allocationId || isNaN(allocationId)) {
      return res.status(400).json({ error: 'Invalid allocation ID' });
    }

    if (req.method === 'GET') {
      return await handleGetAllocation(req, res, allocationId);
    } else if (req.method === 'PUT') {
      return await handleUpdateAllocation(req, res, allocationId);
    } else if (req.method === 'DELETE') {
      return await handleDeleteAllocation(req, res, allocationId);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[ALLOCATION_DETAIL] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Handle GET requests - fetch specific allocation
async function handleGetAllocation(req, res, allocationId) {
  console.log('[ALLOCATION_DETAIL] Fetching allocation:', allocationId);

  // Fetch the specific allocation
  const allocations = await DatabaseService.getResourceAllocations();
  const allocation = allocations.find(a => a.id === allocationId);

  if (!allocation) {
    return res.status(404).json({ error: 'Allocation not found' });
  }

  console.log('[ALLOCATION_DETAIL] Found allocation for resource:', allocation.resourceId);
  return res.json(allocation);
}

// Handle PUT requests - update allocation
async function handleUpdateAllocation(req, res, allocationId) {
  console.log('[ALLOCATION_DETAIL] Updating allocation:', allocationId);
  console.log('[ALLOCATION_DETAIL] Request body:', req.body);

  // Validate that allocation exists
  const allocations = await DatabaseService.getResourceAllocations();
  const existingAllocation = allocations.find(a => a.id === allocationId);

  if (!existingAllocation) {
    return res.status(404).json({ error: 'Allocation not found' });
  }

  // Validate and prepare update data
  const updateData = {};
  const { projectId, resourceId, allocatedHours, startDate, endDate, role, status, weeklyAllocations } = req.body;

  if (projectId !== undefined) {
    const parsedProjectId = parseInt(projectId);
    if (isNaN(parsedProjectId)) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }
    updateData.projectId = parsedProjectId;
  }

  if (resourceId !== undefined) {
    const parsedResourceId = parseInt(resourceId);
    if (isNaN(parsedResourceId)) {
      return res.status(400).json({ error: 'Invalid resourceId' });
    }
    updateData.resourceId = parsedResourceId;
  }

  if (allocatedHours !== undefined) {
    updateData.allocatedHours = allocatedHours.toString();
  }

  if (startDate !== undefined) {
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid startDate format' });
    }
    updateData.startDate = startDateObj.toISOString();
  }

  if (endDate !== undefined) {
    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid endDate format' });
    }
    updateData.endDate = endDateObj.toISOString();
  }

  if (role !== undefined) {
    updateData.role = role;
  }

  if (status !== undefined) {
    updateData.status = status;
  }

  if (weeklyAllocations !== undefined) {
    updateData.weeklyAllocations = weeklyAllocations;
  }

  // Validate date range if both dates are provided
  if (updateData.startDate && updateData.endDate) {
    if (new Date(updateData.startDate) >= new Date(updateData.endDate)) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }
  }

  try {
    console.log('[ALLOCATION_DETAIL] Updating allocation with data:', updateData);

    // Update the allocation using DatabaseService
    const updatedAllocation = await DatabaseService.updateResourceAllocation(allocationId, updateData);

    console.log('[ALLOCATION_DETAIL] Successfully updated allocation:', updatedAllocation);
    return res.json(updatedAllocation);

  } catch (error) {
    console.error('[ALLOCATION_DETAIL] Error updating allocation:', error);
    return res.status(500).json({
      error: 'Failed to update allocation',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Handle DELETE requests - delete allocation
async function handleDeleteAllocation(req, res, allocationId) {
  console.log('[ALLOCATION_DETAIL] Deleting allocation:', allocationId);

  // Validate that allocation exists
  const allocations = await DatabaseService.getResourceAllocations();
  const existingAllocation = allocations.find(a => a.id === allocationId);

  if (!existingAllocation) {
    return res.status(404).json({ error: 'Allocation not found' });
  }

  try {
    // Delete the allocation using DatabaseService
    await DatabaseService.deleteResourceAllocation(allocationId);

    console.log('[ALLOCATION_DETAIL] Successfully deleted allocation:', allocationId);
    return res.status(204).send(); // No content response for successful deletion

  } catch (error) {
    console.error('[ALLOCATION_DETAIL] Error deleting allocation:', error);
    return res.status(500).json({
      error: 'Failed to delete allocation',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}