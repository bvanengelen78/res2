// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('./lib/supabase');

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
    console.log(`[ALLOCATIONS] ${req.method} request to /api/allocations`);

    if (req.method === 'GET') {
      return await handleGetAllocations(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateAllocation(req, res);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[ALLOCATIONS] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Handle GET requests - fetch allocations with filtering
async function handleGetAllocations(req, res) {

  console.log('[ALLOCATIONS] Starting GET allocations request');

  // Extract query parameters
  const { resourceId, projectId, startDate, endDate, status = 'active', department } = req.query;

  console.log('[ALLOCATIONS] Query parameters:', {
    resourceId, projectId, startDate, endDate, status, department
  });

  // Fetch allocations from Supabase
  let allocations = await DatabaseService.getResourceAllocations();
  console.log('[ALLOCATIONS] Raw allocations count:', allocations.length);
    
  // Apply filters
  if (resourceId) {
    allocations = allocations.filter(allocation => allocation.resourceId === parseInt(resourceId));
    console.log('[ALLOCATIONS] After resourceId filter:', allocations.length);
  }

  if (projectId) {
    allocations = allocations.filter(allocation => allocation.projectId === parseInt(projectId));
    console.log('[ALLOCATIONS] After projectId filter:', allocations.length);
  }

  if (status !== 'all') {
    allocations = allocations.filter(allocation => allocation.status === status);
    console.log('[ALLOCATIONS] After status filter:', allocations.length);
  }

  if (startDate && endDate) {
    const filterStartDate = new Date(startDate);
    const filterEndDate = new Date(endDate);
    console.log('[ALLOCATIONS] Date filter:', { filterStartDate, filterEndDate });

    allocations = allocations.filter(allocation => {
      const allocationStart = new Date(allocation.startDate);
      const allocationEnd = new Date(allocation.endDate);

      // Include allocations that overlap with the filter period
      return allocationStart <= filterEndDate && allocationEnd >= filterStartDate;
    });
    console.log('[ALLOCATIONS] After date filter:', allocations.length);
  }

  // If department filter is specified, we need to join with resources
  if (department) {
    try {
      const resources = await DatabaseService.getResources();
      const departmentResourceIds = resources
        .filter(resource => resource.department === department)
        .map(resource => resource.id);

      allocations = allocations.filter(allocation =>
        departmentResourceIds.includes(allocation.resourceId)
      );
      console.log('[ALLOCATIONS] After department filter:', allocations.length);
    } catch (error) {
      console.error('[ALLOCATIONS] Department filter error:', error);
      // Continue without department filter if resources fetch fails
    }
  }

  console.log('[ALLOCATIONS] Final allocations count:', allocations.length);
  return res.json(allocations);
}

// Handle POST requests - create new allocation
async function handleCreateAllocation(req, res) {
  console.log('[ALLOCATIONS] Starting POST allocation creation');
  console.log('[ALLOCATIONS] Request body:', req.body);

  // Validate required fields
  const { projectId, resourceId, allocatedHours, startDate, endDate, role, status } = req.body;

  if (!projectId || !resourceId || !allocatedHours || !startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['projectId', 'resourceId', 'allocatedHours', 'startDate', 'endDate']
    });
  }

  // Validate data types
  const parsedProjectId = parseInt(projectId);
  const parsedResourceId = parseInt(resourceId);

  if (isNaN(parsedProjectId) || isNaN(parsedResourceId)) {
    return res.status(400).json({
      error: 'Invalid data types',
      message: 'projectId and resourceId must be valid numbers'
    });
  }

  // Validate dates
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    return res.status(400).json({
      error: 'Invalid date format',
      message: 'startDate and endDate must be valid ISO date strings'
    });
  }

  if (startDateObj >= endDateObj) {
    return res.status(400).json({
      error: 'Invalid date range',
      message: 'startDate must be before endDate'
    });
  }

  try {
    // Create allocation data object
    const allocationData = {
      projectId: parsedProjectId,
      resourceId: parsedResourceId,
      allocatedHours: allocatedHours.toString(),
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      role: role || '',
      status: status || 'active',
      weeklyAllocations: {} // Initialize empty weekly allocations
    };

    console.log('[ALLOCATIONS] Creating allocation with data:', allocationData);

    // Create the allocation using DatabaseService
    const newAllocation = await DatabaseService.createResourceAllocation(allocationData);

    console.log('[ALLOCATIONS] Successfully created allocation:', newAllocation);

    return res.status(201).json(newAllocation);

  } catch (error) {
    console.error('[ALLOCATIONS] Error creating allocation:', error);

    return res.status(500).json({
      error: 'Failed to create allocation',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
