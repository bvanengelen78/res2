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
    console.log('[PROJECT_DETAIL] Starting project detail request');

    // Extract project ID from URL
    const { id } = req.query;
    const projectId = parseInt(id);

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Extract query parameters
    const { includeAllocations = false, includeMetrics = false, includeTimeEntries = false } = req.query;

    console.log('[PROJECT_DETAIL] Query parameters:', {
      projectId, includeAllocations, includeMetrics, includeTimeEntries
    });

    // Fetch the specific project
    const projects = await DatabaseService.getProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    console.log('[PROJECT_DETAIL] Found project:', project.name);

    // Build response object
    let responseData = { ...project };

    // Include allocations if requested
    if (includeAllocations === true || includeAllocations === 'true') {
      try {
        const allocations = await DatabaseService.getResourceAllocations();
        responseData.allocations = allocations.filter(allocation => allocation.projectId === projectId);
        console.log('[PROJECT_DETAIL] Added allocations:', responseData.allocations.length);
      } catch (error) {
        console.error('[PROJECT_DETAIL] Failed to fetch allocations:', error);
        responseData.allocations = [];
      }
    }

    // Include time entries if requested
    if (includeTimeEntries === true || includeTimeEntries === 'true') {
      try {
        const timeEntries = await DatabaseService.getTimeEntries();
        responseData.timeEntries = timeEntries.filter(entry => entry.projectId === projectId);
        console.log('[PROJECT_DETAIL] Added time entries:', responseData.timeEntries.length);
      } catch (error) {
        console.error('[PROJECT_DETAIL] Failed to fetch time entries:', error);
        responseData.timeEntries = [];
      }
    }

    // Include metrics if requested (basic calculation)
    if (includeMetrics === true || includeMetrics === 'true') {
      try {
        const allocations = responseData.allocations || await DatabaseService.getResourceAllocations().then(allocs =>
          allocs.filter(allocation => allocation.projectId === projectId)
        );

        // Calculate basic metrics
        const totalAllocatedHours = allocations.reduce((sum, alloc) => sum + (alloc.allocatedHours || 0), 0);
        const activeAllocations = allocations.filter(alloc => alloc.status === 'active').length;
        const uniqueResources = new Set(allocations.map(alloc => alloc.resourceId)).size;

        responseData.metrics = {
          totalAllocatedHours,
          activeAllocations,
          uniqueResources,
          estimatedHours: project.estimatedHours || 0,
          utilizationPercentage: project.estimatedHours ?
            Math.round((totalAllocatedHours / project.estimatedHours) * 100) : 0
        };

        console.log('[PROJECT_DETAIL] Added metrics:', responseData.metrics);
      } catch (error) {
        console.error('[PROJECT_DETAIL] Failed to calculate metrics:', error);
        responseData.metrics = null;
      }
    }

    console.log('[PROJECT_DETAIL] Response prepared for project:', projectId);

    return res.json(responseData);

  } catch (error) {
    console.error('[PROJECT_DETAIL] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch project details',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};








