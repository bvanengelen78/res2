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

  try {
    console.log(`[PROJECTS] ${req.method} request to /api/projects`);

    if (req.method === 'GET') {
      return await handleGetProjects(req, res);
    } else if (req.method === 'POST') {
      return await handleCreateProject(req, res);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[PROJECTS] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Handle GET requests - fetch projects with filtering
async function handleGetProjects(req, res) {
  console.log('[PROJECTS] Starting GET projects request');

  // Extract query parameters
  const { status = 'active', includeAllocations = false, search } = req.query;

  console.log('[PROJECTS] Query parameters:', {
    status, includeAllocations, search
  });

  // Fetch projects from Supabase
  let projects = await DatabaseService.getProjects();
  console.log('[PROJECTS] Raw projects count:', projects.length);

  // If no projects found, provide fallback data for demo purposes
  if (!projects || projects.length === 0) {
    console.log('[PROJECTS] No projects found in database, using fallback data');
    projects = [
      {
        id: 1,
        name: "Demo Project Alpha",
        description: "A demonstration project for testing purposes",
        status: "active",
        priority: "high",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        estimatedHours: 1000,
        isActive: true,
        department: "Engineering",
        type: "business",
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: "Demo Project Beta",
        description: "Another demonstration project",
        status: "active",
        priority: "medium",
        startDate: "2025-02-01",
        endDate: "2025-11-30",
        estimatedHours: 800,
        isActive: true,
        department: "Product",
        type: "change",
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Apply filters
  if (status !== 'all') {
    // Debug: Log the isActive values to understand the data structure
    console.log('[PROJECTS] Sample project isActive values:', projects.slice(0, 3).map(p => ({ id: p.id, name: p.name, isActive: p.isActive, status: p.status })));

    // Projects use isActive field, but be more flexible with the filtering
    if (status === 'active') {
      // For active status, include projects where isActive is true OR null/undefined (default to active)
      projects = projects.filter(project => project.isActive === true || project.isActive == null);
    } else if (status === 'inactive') {
      // For inactive status, only include projects explicitly marked as inactive
      projects = projects.filter(project => project.isActive === false);
    }
    console.log('[PROJECTS] After status filter:', projects.length);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    projects = projects.filter(project =>
      project.name.toLowerCase().includes(searchLower) ||
      (project.description && project.description.toLowerCase().includes(searchLower)) ||
      (project.client && project.client.toLowerCase().includes(searchLower))
    );
    console.log('[PROJECTS] After search filter:', projects.length);
  }

  // Include allocations if requested
  if (includeAllocations === true || includeAllocations === 'true') {
    try {
      const allocations = await DatabaseService.getResourceAllocations();

      projects = projects.map(project => ({
        ...project,
        allocations: allocations.filter(allocation => allocation.projectId === project.id)
      }));
      console.log('[PROJECTS] Added allocations to projects');
    } catch (error) {
      console.error('[PROJECTS] Failed to fetch allocations:', error);
      // Continue without allocations if fetch fails
    }
  }

  console.log('[PROJECTS] Final projects count:', projects.length);
  return res.json(projects);
}

// Handle POST requests - create new project
async function handleCreateProject(req, res) {
  console.log('[PROJECTS] Starting POST project creation');
  console.log('[PROJECTS] Request body:', req.body);

  // Validate required fields
  const { name, description, startDate, endDate, status, priority, type } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'startDate', 'endDate']
    });
  }

  // Validate dates
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
    return res.status(400).json({
      error: 'Invalid date format',
      message: 'startDate and endDate must be valid ISO date strings'
    });
  }

  if (startDateObj >= endDateObj) {
    return res.status(400).json({
      error: 'Invalid date range',
      message: 'startDate must be before endDate'
    });
  }

  try {
    // Create project data object
    const projectData = {
      name: name.trim(),
      description: description?.trim() || '',
      startDate: startDateObj.toISOString(),
      endDate: endDateObj.toISOString(),
      status: status || 'draft',
      priority: priority || 'medium',
      type: type || 'business',
      stream: req.body.stream || 'staff',
      ogsmCharter: req.body.ogsmCharter || '',
      directorId: req.body.directorId ? parseInt(req.body.directorId) : null,
      changeLeadId: req.body.changeLeadId ? parseInt(req.body.changeLeadId) : null,
      businessLeadId: req.body.businessLeadId ? parseInt(req.body.businessLeadId) : null,
      estimatedHours: req.body.estimatedHours ? parseInt(req.body.estimatedHours) : 0
    };

    console.log('[PROJECTS] Creating project with data:', projectData);

    // Create the project using DatabaseService
    const newProject = await DatabaseService.createProject(projectData);

    console.log('[PROJECTS] Successfully created project:', newProject);

    return res.status(201).json(newProject);

  } catch (error) {
    console.error('[PROJECTS] Error creating project:', error);

    return res.status(500).json({
      error: 'Failed to create project',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
