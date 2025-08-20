const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schemas
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

// Schema for creating projects
const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'on-hold', 'cancelled']).optional().default('active'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  estimatedHours: z.number().min(0, 'Estimated hours must be non-negative').optional(),
  department: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  ogsmCharterId: z.number().int().positive().optional()
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

  // Always return a safe response, never throw errors to middleware
  let projects = [];

  try {
    // Fetch projects from Supabase (no fallback to mock data)
    projects = await DatabaseService.getProjects();

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

  } catch (error) {
    Logger.error('Failed to fetch projects', error, { userId: user.id });
    // Don't throw - just use empty array as fallback
    projects = [];
  }

  // Always return a valid array (never throw errors to middleware)
  return res.json(projects);
};

// Create project handler
const createProjectHandler = async (req, res, { user, validatedData }) => {
  Logger.info('Creating new project', {
    userId: user.id,
    data: validatedData
  });

  try {
    // Use Supabase client directly for creation
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const insertData = {
      name: validatedData.name,
      description: validatedData.description || null,
      status: validatedData.status || 'active',
      start_date: validatedData.startDate,
      end_date: validatedData.endDate,
      estimated_hours: validatedData.estimatedHours || null,
      department: validatedData.department || null,
      priority: validatedData.priority || 'medium',
      ogsm_charter_id: validatedData.ogsmCharterId || null
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      Logger.error('Failed to create project in database', error, {
        userId: user.id,
        data: validatedData
      });
      throw new Error(`Database error: ${error.message}`);
    }

    // Convert to camelCase for response
    const project = {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      startDate: data.start_date,
      endDate: data.end_date,
      estimatedHours: data.estimated_hours,
      department: data.department,
      priority: data.priority,
      ogsmCharterId: data.ogsm_charter_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    Logger.info('Project created successfully', {
      userId: user.id,
      projectId: project.id,
      projectName: project.name
    });

    return res.status(201).json(project);
  } catch (error) {
    Logger.error('Failed to create project', error, { userId: user.id });
    return res.status(500).json({ message: 'Failed to create project' });
  }
};

// Main handler that routes based on HTTP method
const projectsMainHandler = async (req, res, context) => {
  const { method } = req;

  switch (method) {
    case 'GET':
      return projectsHandler(req, res, context);
    case 'POST':
      // Validate with create schema
      const createValidation = createProjectSchema.safeParse(req.body);
      if (!createValidation.success) {
        Logger.warn('Invalid project data for creation', {
          errors: createValidation.error.errors,
          userId: context.user?.id
        });
        return res.status(400).json({
          message: 'Invalid project data',
          errors: createValidation.error.errors
        });
      }
      return createProjectHandler(req, res, {
        ...context,
        validatedData: createValidation.data
      });
    default:
      return res.status(405).json({ message: `Method ${method} not allowed` });
  }
};

// Export with middleware
module.exports = withMiddleware(projectsMainHandler, {
  requireAuth: true,
  allowedMethods: ['GET', 'POST'],
  validateSchema: projectsQuerySchema // Only for GET requests
});
