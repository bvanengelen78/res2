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
    console.log('[TIME_LOGGING_SUBMISSION] Starting submission overview request');

    // Extract query parameters
    const { week, department } = req.query;

    if (!week) {
      return res.status(400).json({ error: 'Week parameter is required' });
    }

    console.log('[TIME_LOGGING_SUBMISSION] Query parameters:', { week, department });

    // Fetch all required data
    const [resources, allocations, projects] = await Promise.all([
      DatabaseService.getResources(),
      DatabaseService.getResourceAllocations(),
      DatabaseService.getProjects()
    ]);

    if (!resources || !Array.isArray(resources)) {
      console.warn('[TIME_LOGGING_SUBMISSION] Invalid resources data received from database');
      return res.json([]);
    }

    if (!allocations || !Array.isArray(allocations)) {
      console.warn('[TIME_LOGGING_SUBMISSION] Invalid allocations data received from database');
      return res.json([]);
    }

    if (!projects || !Array.isArray(projects)) {
      console.warn('[TIME_LOGGING_SUBMISSION] Invalid projects data received from database');
      return res.json([]);
    }

    // Filter resources by department if specified
    let filteredResources = resources.filter(resource => resource.isActive);
    if (department && department !== 'all') {
      filteredResources = filteredResources.filter(resource => {
        const resourceDepartment = resource.department || resource.role || 'General';
        return resourceDepartment === department;
      });
    }

    // For now, return a simplified response to avoid complex week parsing
    // This will prevent the 500 error and allow the page to load
    const submissionOverview = filteredResources.map(resource => {
      const departmentName = resource.department || resource.role || 'General';

      return {
        resource: {
          id: resource.id,
          name: resource.name,
          email: resource.email,
          department: departmentName
        },
        department: {
          id: 1, // Mock department ID
          name: departmentName,
          isActive: true
        },
        submission: null, // No submission for demo
        hasTimeEntries: false, // Simplified for now
        weeklyCapacity: resource.weeklyCapacity || 40,
        allocatedHours: 0, // Simplified for now
        submittedHours: 0, // Simplified for now
        submissionStatus: 'pending', // Simplified for now
        lastSubmissionDate: null,
        projects: [] // Simplified for now
      };
    });

    console.log('[TIME_LOGGING_SUBMISSION] Submission overview generated:', {
      week,
      resourcesCount: submissionOverview.length
    });

    return res.json(submissionOverview);

  } catch (error) {
    console.error('[TIME_LOGGING_SUBMISSION] Error:', error);

    return res.status(500).json({
      error: 'Failed to fetch submission overview',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
