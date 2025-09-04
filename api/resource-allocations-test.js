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

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('[RESOURCE_ALLOCATIONS_TEST] Starting resource allocations test request');

    // Extract resource ID from query
    const { resourceId = 2 } = req.query;
    const parsedResourceId = parseInt(resourceId);

    if (!parsedResourceId || isNaN(parsedResourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }

    console.log('[RESOURCE_ALLOCATIONS_TEST] Query parameters:', {
      resourceId: parsedResourceId
    });

    // Fetch allocations and projects (same pattern as project allocations endpoint)
    const [allocations, projects] = await Promise.all([
      DatabaseService.getResourceAllocations(),
      DatabaseService.getProjects()
    ]);

    // Filter allocations for this resource
    let resourceAllocations = allocations.filter(allocation => allocation.resourceId === parsedResourceId);

    // Apply status filter
    resourceAllocations = resourceAllocations.filter(allocation => allocation.status === 'active');

    // Enrich allocations with project information (same pattern as project allocations endpoint)
    resourceAllocations = resourceAllocations.map(allocation => {
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
          priority: project.priority,
          description: project.description
        } : null
      };
    });

    console.log('[RESOURCE_ALLOCATIONS_TEST] Filtered allocations count:', resourceAllocations.length);

    return res.json(resourceAllocations);

  } catch (error) {
    console.error('[RESOURCE_ALLOCATIONS_TEST] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch resource allocations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
