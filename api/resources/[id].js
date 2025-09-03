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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[RESOURCE_DETAIL] Starting resource detail request');

    // Extract resource ID from URL
    const { id } = req.query;
    const resourceId = parseInt(id);

    if (!resourceId || isNaN(resourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }

    // Extract query parameters
    const { includeAllocations = true, includeMetrics = false, includeTimeEntries = false } = req.query;

    console.log('[RESOURCE_DETAIL] Query parameters:', {
      resourceId, includeAllocations, includeMetrics, includeTimeEntries
    });

    // Fetch the specific resource
    const resources = await DatabaseService.getResources();
    const resource = resources.find(r => r.id === resourceId);

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    console.log('[RESOURCE_DETAIL] Found resource:', resource.name);

    // Build response object
    let responseData = { ...resource };

    // Include allocations if requested
    if (includeAllocations === true || includeAllocations === 'true') {
      try {
        const allocations = await DatabaseService.getResourceAllocations();
        responseData.allocations = allocations.filter(allocation => allocation.resourceId === resourceId);
        console.log('[RESOURCE_DETAIL] Added allocations:', responseData.allocations.length);
      } catch (error) {
        console.error('[RESOURCE_DETAIL] Failed to fetch allocations:', error);
        responseData.allocations = [];
      }
    }

    // Include time entries if requested
    if (includeTimeEntries === true || includeTimeEntries === 'true') {
      try {
        const timeEntries = await DatabaseService.getTimeEntries();
        responseData.timeEntries = timeEntries.filter(entry => entry.resourceId === resourceId);
        console.log('[RESOURCE_DETAIL] Added time entries:', responseData.timeEntries.length);
      } catch (error) {
        console.error('[RESOURCE_DETAIL] Failed to fetch time entries:', error);
        responseData.timeEntries = [];
      }
    }

    // Include metrics if requested (basic calculation)
    if (includeMetrics === true || includeMetrics === 'true') {
      try {
        const allocations = responseData.allocations || await DatabaseService.getResourceAllocations().then(allocs =>
          allocs.filter(allocation => allocation.resourceId === resourceId)
        );

        // Calculate basic metrics
        const totalAllocatedHours = allocations.reduce((sum, alloc) => sum + (alloc.allocatedHours || 0), 0);
        const activeAllocations = allocations.filter(alloc => alloc.status === 'active').length;

        responseData.metrics = {
          totalAllocatedHours,
          activeAllocations,
          weeklyCapacity: resource.weeklyCapacity || 40,
          utilizationPercentage: resource.weeklyCapacity ?
            Math.round((totalAllocatedHours / resource.weeklyCapacity) * 100) : 0
        };

        console.log('[RESOURCE_DETAIL] Added metrics:', responseData.metrics);
      } catch (error) {
        console.error('[RESOURCE_DETAIL] Failed to calculate metrics:', error);
        responseData.metrics = null;
      }
    }

    console.log('[RESOURCE_DETAIL] Response prepared for resource:', resourceId);

    return res.json(responseData);

  } catch (error) {
    console.error('[RESOURCE_DETAIL] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch resource details',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};


