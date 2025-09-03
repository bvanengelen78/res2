// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { DatabaseService } = require('../../lib/supabase');

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
    console.log('[PROJECT_ALLOCATIONS] Starting project allocations request');

    // Extract project ID from URL
    const { id } = req.query;
    const projectId = parseInt(id);

    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Extract query parameters
    const { includeResources = true, status = 'active' } = req.query;

    console.log('[PROJECT_ALLOCATIONS] Query parameters:', {
      projectId, includeResources, status
    });

    // Fetch allocations and resources
    const [allocations, resources] = await Promise.all([
      DatabaseService.getResourceAllocations(),
      DatabaseService.getResources()
    ]);

    // Filter allocations for this project
    let projectAllocations = allocations.filter(allocation => allocation.projectId === projectId);

    // Apply status filter
    if (status !== 'all') {
      const statusFilter = status === 'active' ? 'active' : status;
      projectAllocations = projectAllocations.filter(allocation => allocation.status === statusFilter);
    }

    // Enrich allocations with resource information if requested
    if (includeResources === true || includeResources === 'true') {
      projectAllocations = projectAllocations.map(allocation => {
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
    }

    console.log('[PROJECT_ALLOCATIONS] Filtered allocations count:', projectAllocations.length);

    return res.json(projectAllocations);

  } catch (error) {
    console.error('[PROJECT_ALLOCATIONS] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch project allocations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
