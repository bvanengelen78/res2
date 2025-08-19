// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger, createSuccessResponse, createErrorResponse } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schema
const departmentsQuerySchema = z.object({
  includeResourceCount: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false),
  includeProjectCount: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(false)
});

// Main departments handler
const departmentsHandler = async (req, res, { user, validatedData }) => {
  const { includeResourceCount, includeProjectCount } = validatedData;
  
  Logger.info('Fetching departments', {
    userId: user.id,
    includeResourceCount,
    includeProjectCount
  });

  try {
    // Fetch departments from Supabase
    let departments = await DatabaseService.getDepartments();
    
    // Include resource and project counts if requested
    if (includeResourceCount || includeProjectCount) {
      const [resources, projects] = await Promise.all([
        includeResourceCount ? DatabaseService.getResources() : Promise.resolve([]),
        includeProjectCount ? DatabaseService.getProjects() : Promise.resolve([])
      ]);

      departments = departments.map(department => {
        const departmentData = { ...department };
        
        if (includeResourceCount) {
          const resourceCount = resources.filter(r => {
            const resourceDepartment = r.department || r.role || 'General';
            return resourceDepartment === department.name;
          }).length;
          departmentData.resourceCount = resourceCount;
        }
        
        if (includeProjectCount) {
          const projectCount = projects.filter(p => {
            const projectDepartment = p.department || 'General';
            return projectDepartment === department.name;
          }).length;
          departmentData.projectCount = projectCount;
        }
        
        return departmentData;
      });
    }

    Logger.info('Departments fetched successfully', {
      userId: user.id,
      count: departments.length,
      includeResourceCount,
      includeProjectCount
    });

    return res.json(departments);
  } catch (error) {
    Logger.error('Failed to fetch departments', error, { userId: user.id });
    
    // Return safe fallback data structure
    const fallbackDepartments = [
      { id: 1, name: 'Engineering', description: 'Software development and technical operations' },
      { id: 2, name: 'Design', description: 'User experience and visual design' },
      { id: 3, name: 'Product', description: 'Product management and strategy' },
      { id: 4, name: 'Marketing', description: 'Marketing and communications' },
      { id: 5, name: 'Sales', description: 'Sales and business development' }
    ];
    
    return res.json(fallbackDepartments);
  }
};

// Export with middleware
module.exports = withMiddleware(departmentsHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: departmentsQuerySchema
});
