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
    console.log('[RESOURCE_RELATIONSHIPS] Starting resource relationships request');

    // Extract resource ID from URL
    const { id } = req.query;
    const resourceId = parseInt(id);

    if (!resourceId || isNaN(resourceId)) {
      return res.status(400).json({ error: 'Invalid resource ID' });
    }

    // Extract query parameters
    const { includeDetails = true } = req.query;

    console.log('[RESOURCE_RELATIONSHIPS] Query parameters:', {
      resourceId, includeDetails
    });

    // Fetch all related data
    const [allocations, projects] = await Promise.all([
      DatabaseService.getResourceAllocations(),
      DatabaseService.getProjects()
    ]);

    // Filter allocations for this resource
    const resourceAllocations = allocations.filter(allocation => allocation.resourceId === resourceId);

    // Get unique projects this resource is allocated to
    const projectIds = [...new Set(resourceAllocations.map(allocation => allocation.projectId))];
    const relatedProjects = projects.filter(project => projectIds.includes(project.id));

    // Determine if resource can be safely deleted
    const activeAllocations = resourceAllocations.filter(allocation => allocation.status === 'active');
    const activeProjects = relatedProjects.filter(project => project.status === 'active');

    const canDelete = activeAllocations.length === 0 && activeProjects.length === 0;

    // Generate warnings for deletion
    if (activeAllocations.length > 0) {
      warnings.push(`Resource has ${activeAllocations.length} active allocation(s)`);
    }
    if (activeProjects.length > 0) {
      warnings.push(`Resource is allocated to ${activeProjects.length} active project(s)`);
    }

    const relationships = {
      allocations: includeDetails === true || includeDetails === 'true' ? resourceAllocations.map(allocation => {
        const project = projects.find(p => p.id === allocation.projectId);
        return {
          ...allocation,
          project: project ? {
            id: project.id,
            name: project.name,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate
          } : null
        };
      }) : resourceAllocations,
      projects: includeDetails === true || includeDetails === 'true' ? relatedProjects : relatedProjects.map(p => ({ id: p.id, name: p.name, status: p.status })),
      timeEntries: [], // TODO: Add time entries when available
      canDelete,
      warnings,
      summary: {
        totalAllocations: resourceAllocations.length,
        activeAllocations: activeAllocations.length,
        totalProjects: relatedProjects.length,
        activeProjects: activeProjects.length
      }
    };

    console.log('[RESOURCE_RELATIONSHIPS] Relationships found:', {
      allocations: relationships.allocations.length,
      projects: relationships.projects.length,
      canDelete: relationships.canDelete
    });

    return res.json(relationships);

  } catch (error) {
    console.error('[RESOURCE_RELATIONSHIPS] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch resource relationships',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
