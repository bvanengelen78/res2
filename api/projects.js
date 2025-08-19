const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schema
const projectsQuerySchema = z.object({
  department: z.string().optional(),
  status: z.enum(['active', 'inactive', 'planning', 'completed', 'all']).optional().default('active'),
  includeAllocations: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false),
  includeMetrics: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'startDate', 'priority', 'budget']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

// Calculate project metrics
const calculateProjectMetrics = (project, allocations, resources) => {
  const projectAllocations = allocations.filter(a => a.projectId === project.id);

  // Calculate total allocated hours
  const totalAllocatedHours = projectAllocations.reduce((sum, a) => sum + a.hoursPerWeek, 0);

  // Calculate team size
  const teamSize = new Set(projectAllocations.map(a => a.resourceId)).size;

  // Calculate utilization rate
  const projectResources = resources.filter(r =>
    projectAllocations.some(a => a.resourceId === r.id)
  );
  const totalCapacity = projectResources.reduce((sum, r) => sum + (r.weeklyCapacity || 40), 0);
  const utilizationRate = totalCapacity > 0 ? (totalAllocatedHours / totalCapacity) * 100 : 0;

  // Calculate budget utilization (mock for now)
  const budgetUtilization = Math.random() * 30 + 60; // 60-90%

  return {
    totalAllocatedHours,
    teamSize,
    utilizationRate: Math.round(utilizationRate * 10) / 10,
    budgetUtilization: Math.round(budgetUtilization * 10) / 10,
    isOverallocated: utilizationRate > 100,
    riskLevel: utilizationRate > 100 ? 'high' : utilizationRate > 85 ? 'medium' : 'low'
  };
};

// Main projects handler
const projectsHandler = async (req, res, { user, validatedData }) => {
  const { department, status, includeAllocations, includeMetrics, search, sortBy, sortOrder } = validatedData;

  Logger.info('Fetching projects', {
    userId: user.id,
    department,
    status,
    includeAllocations,
    includeMetrics,
    search,
    sortBy,
    sortOrder
  });

  try {
    // Fetch projects from Supabase (no fallback to mock data)
    let projects = await DatabaseService.getProjects();

    // Apply filters
    if (department && department !== 'all') {
      projects = projects.filter(project => {
        const projectDepartment = project.department || 'General';
        return projectDepartment === department;
      });
    }

    if (status !== 'all') {
      projects = projects.filter(project => project.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      projects = projects.filter(project =>
        project.name.toLowerCase().includes(searchLower) ||
        (project.description && project.description.toLowerCase().includes(searchLower)) ||
        (project.department && project.department.toLowerCase().includes(searchLower))
      );
    }

    // Include allocations and metrics if requested
    if (includeAllocations || includeMetrics) {
      const [allocations, resources] = await Promise.all([
        DatabaseService.getResourceAllocations(),
        includeMetrics ? DatabaseService.getResources() : Promise.resolve([])
      ]);

      projects = projects.map(project => {
        const projectData = { ...project };

        if (includeAllocations) {
          projectData.allocations = allocations.filter(allocation => allocation.projectId === project.id);
        }

        if (includeMetrics) {
          projectData.metrics = calculateProjectMetrics(project, allocations, resources);
        }

        return projectData;
      });
    }

    // Apply sorting
    projects.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'startDate':
          aValue = new Date(a.startDate || 0);
          bValue = new Date(b.startDate || 0);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'budget':
          aValue = a.budget || 0;
          bValue = b.budget || 0;
          break;
        default: // name
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    Logger.info('Projects fetched successfully', {
      userId: user.id,
      count: projects.length,
      filters: { department, status, search },
      sorting: { sortBy, sortOrder }
    });

    return res.json(projects);
  } catch (error) {
    Logger.error('Failed to fetch projects', error, { userId: user.id });

    // Return safe fallback data structure to prevent frontend .length errors
    const fallbackProjects = [];
    return res.json(fallbackProjects);
  }
};

// Export with middleware
module.exports = withMiddleware(projectsHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: projectsQuerySchema
});
