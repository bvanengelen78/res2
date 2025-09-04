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
    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Starting debug request');

    // Extract resource ID from query
    const { resourceId = 2 } = req.query;
    const parsedResourceId = parseInt(resourceId);

    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Testing resource ID:', parsedResourceId);

    // Test 1: Fetch all allocations
    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Step 1: Fetching all allocations');
    const allAllocations = await DatabaseService.getResourceAllocations();
    console.log('[DEBUG_RESOURCE_ALLOCATIONS] All allocations count:', allAllocations.length);

    // Test 2: Filter for specific resource
    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Step 2: Filtering for resource', parsedResourceId);
    const resourceAllocations = allAllocations.filter(allocation => allocation.resourceId === parsedResourceId);
    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Resource allocations count:', resourceAllocations.length);

    // Test 3: Fetch projects
    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Step 3: Fetching projects');
    const projects = await DatabaseService.getProjects();
    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Projects count:', projects.length);

    // Test 4: Enrich allocations with project data
    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Step 4: Enriching allocations with project data');
    const enrichedAllocations = resourceAllocations.map(allocation => {
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

    console.log('[DEBUG_RESOURCE_ALLOCATIONS] Enriched allocations count:', enrichedAllocations.length);

    return res.json({
      success: true,
      resourceId: parsedResourceId,
      allAllocationsCount: allAllocations.length,
      resourceAllocationsCount: resourceAllocations.length,
      projectsCount: projects.length,
      enrichedAllocationsCount: enrichedAllocations.length,
      sampleAllocation: allAllocations[0] || null,
      sampleProject: projects[0] || null,
      enrichedAllocations: enrichedAllocations
    });

  } catch (error) {
    console.error('[DEBUG_RESOURCE_ALLOCATIONS] Error:', error);

    return res.status(500).json({
      error: 'Debug failed',
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
