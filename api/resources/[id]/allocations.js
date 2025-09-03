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
    console.log('[RESOURCE_ALLOCATIONS] Starting resource allocations request');

    // Extract resource ID from URL
    const { id } = req.query;
    const resourceId = parseInt(id);

    if (!resourceId || isNaN(resourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }

    // Extract query parameters
    const { includeProjects = true, status = 'active', startDate, endDate } = req.query;

    console.log('[RESOURCE_ALLOCATIONS] Query parameters:', {
      resourceId, includeProjects, status, startDate, endDate
    });

    // Fetch allocations and projects
    const [allocations, projects] = await Promise.all([
      DatabaseService.getResourceAllocations(),
      includeProjects === true || includeProjects === 'true' ? DatabaseService.getProjects() : Promise.resolve([])
    ]);

    // Filter allocations for this resource
    let resourceAllocations = allocations.filter(allocation => allocation.resourceId === resourceId);

    // Apply status filter if specified
    if (status !== 'all') {
      resourceAllocations = resourceAllocations.filter(allocation => allocation.status === status);
    }

    // Apply date range filter if specified
    if (startDate && endDate) {
      resourceAllocations = resourceAllocations.filter(allocation => {
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        const filterStart = new Date(startDate);
        const filterEnd = new Date(endDate);

        // Check if allocation overlaps with the date range
        return allocationStart <= filterEnd && allocationEnd >= filterStart;
      });
    }

      // Enrich allocations with project information
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
    }

    console.log('[RESOURCE_ALLOCATIONS] Filtered allocations count:', resourceAllocations.length);

    return res.json(resourceAllocations);

  } catch (error) {
    console.error('[RESOURCE_ALLOCATIONS] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch resource allocations',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }

