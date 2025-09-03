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
    console.log('[RESOURCES] Starting resources request');

    // Extract query parameters
    const { department, status = 'active', includeAllocations = false, search } = req.query;
    
    console.log('[RESOURCES] Query parameters:', { 
      department, status, includeAllocations, search 
    });

    // Fetch resources from Supabase
    let resources = await DatabaseService.getResources();
    console.log('[RESOURCES] Raw resources count:', resources.length);
    
    // Apply filters
    if (department && department !== 'all') {
      resources = resources.filter(resource => {
        const resourceDepartment = resource.department || resource.role || 'General';
        return resourceDepartment === department;
      });
      console.log('[RESOURCES] After department filter:', resources.length);
    }

    if (status !== 'all') {
      // Resources use isActive field instead of status field
      const isActiveFilter = status === 'active' ? true : false;
      resources = resources.filter(resource => resource.isActive === isActiveFilter);
      console.log('[RESOURCES] After status filter:', resources.length);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      resources = resources.filter(resource => 
        resource.name.toLowerCase().includes(searchLower) ||
        (resource.email && resource.email.toLowerCase().includes(searchLower)) ||
        (resource.role && resource.role.toLowerCase().includes(searchLower)) ||
        (resource.department && resource.department.toLowerCase().includes(searchLower))
      );
      console.log('[RESOURCES] After search filter:', resources.length);
    }

    // Include allocations if requested
    if (includeAllocations === true || includeAllocations === 'true') {
      try {
        const allocations = await DatabaseService.getResourceAllocations();
        
        resources = resources.map(resource => ({
          ...resource,
          allocations: allocations.filter(allocation => allocation.resourceId === resource.id)
        }));
        console.log('[RESOURCES] Added allocations to resources');
      } catch (error) {
        console.error('[RESOURCES] Failed to fetch allocations:', error);
        // Continue without allocations if fetch fails
      }
    }

    console.log('[RESOURCES] Final resources count:', resources.length);

    return res.json(resources);

  } catch (error) {
    console.error('[RESOURCES] Error:', error);
    
    return res.status(500).json({
      error: 'Failed to fetch resources',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
