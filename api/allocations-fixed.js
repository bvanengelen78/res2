// Fixed allocations endpoint that bypasses middleware issues

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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[ALLOCATIONS_FIXED] Starting allocations request');

    // Extract query parameters
    const { resourceId, projectId, startDate, endDate, status = 'active', department } = req.query;
    
    console.log('[ALLOCATIONS_FIXED] Query parameters:', { 
      resourceId, projectId, startDate, endDate, status, department 
    });

    // Import DatabaseService
    const { DatabaseService } = require('./lib/supabase');
    
    // Fetch allocations from Supabase
    let allocations = await DatabaseService.getResourceAllocations();
    console.log('[ALLOCATIONS_FIXED] Raw allocations count:', allocations.length);
    
    // Apply filters
    if (resourceId) {
      allocations = allocations.filter(allocation => allocation.resourceId === parseInt(resourceId));
      console.log('[ALLOCATIONS_FIXED] After resourceId filter:', allocations.length);
    }

    if (projectId) {
      allocations = allocations.filter(allocation => allocation.projectId === parseInt(projectId));
      console.log('[ALLOCATIONS_FIXED] After projectId filter:', allocations.length);
    }

    if (status !== 'all') {
      allocations = allocations.filter(allocation => allocation.status === status);
      console.log('[ALLOCATIONS_FIXED] After status filter:', allocations.length);
    }

    if (startDate && endDate) {
      const filterStartDate = new Date(startDate);
      const filterEndDate = new Date(endDate);
      console.log('[ALLOCATIONS_FIXED] Date filter:', { filterStartDate, filterEndDate });
      
      allocations = allocations.filter(allocation => {
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        
        // Include allocations that overlap with the filter period
        return allocationStart <= filterEndDate && allocationEnd >= filterStartDate;
      });
      console.log('[ALLOCATIONS_FIXED] After date filter:', allocations.length);
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
        console.log('[ALLOCATIONS_FIXED] After department filter:', allocations.length);
      } catch (error) {
        console.error('[ALLOCATIONS_FIXED] Department filter error:', error);
        // Continue without department filter if resources fetch fails
      }
    }

    console.log('[ALLOCATIONS_FIXED] Final allocations count:', allocations.length);

    return res.json(allocations);

  } catch (error) {
    console.error('[ALLOCATIONS_FIXED] Error:', error);
    
    return res.status(500).json({
      error: 'Failed to fetch allocations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
