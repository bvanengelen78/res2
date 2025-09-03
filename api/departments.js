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
    console.log('[DEPARTMENTS] Starting departments request');

    // Extract query parameters
    const { includeResourceCount = false, includeProjectCount = false } = req.query;

    console.log('[DEPARTMENTS] Query parameters:', { includeResourceCount, includeProjectCount });

    // Always return a safe response, never throw errors
    let departments = [];

    try {
      // Fetch departments from Supabase
      departments = await DatabaseService.getDepartments();
      console.log('[DEPARTMENTS] Raw departments count:', departments.length);

      // Include resource and project counts if requested
      if (includeResourceCount === 'true' || includeProjectCount === 'true') {
        const [resources, projects] = await Promise.all([
          includeResourceCount === 'true' ? DatabaseService.getResources() : Promise.resolve([]),
          includeProjectCount === 'true' ? DatabaseService.getProjects() : Promise.resolve([])
        ]);

        departments = departments.map(department => {
          const departmentData = { ...department };

          if (includeResourceCount === 'true') {
            const resourceCount = resources.filter(r => {
              const resourceDepartment = r.department || r.role || 'General';
              return resourceDepartment === department.name;
            }).length;
            departmentData.resourceCount = resourceCount;
          }

          if (includeProjectCount === 'true') {
            const projectCount = projects.filter(p => {
              const projectDepartment = p.department || 'General';
              return projectDepartment === department.name;
            }).length;
            departmentData.projectCount = projectCount;
          }

          return departmentData;
        });
      }

      console.log('[DEPARTMENTS] Departments fetched successfully:', departments.length);

    } catch (error) {
      console.error('[DEPARTMENTS] Failed to fetch departments:', error);
      // Don't throw - use fallback departments
      departments = [
        { id: 1, name: 'Engineering', description: 'Software development and technical operations' },
        { id: 2, name: 'Design', description: 'User experience and visual design' },
        { id: 3, name: 'Product', description: 'Product management and strategy' },
        { id: 4, name: 'Marketing', description: 'Marketing and communications' },
        { id: 5, name: 'Sales', description: 'Sales and business development' }
      ];
    }

    // Always return a valid array
    return res.json(departments);

  } catch (error) {
    console.error('[DEPARTMENTS] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch departments',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
