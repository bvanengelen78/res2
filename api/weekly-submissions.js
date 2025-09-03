// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('./lib/middleware');
const { DatabaseService } = require('./lib/supabase');

// Input validation schema for weekly submissions query
const weeklySubmissionsQuerySchema = z.object({
  resourceId: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'all']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  department: z.string().optional(),
  limit: z.string().transform(val => parseInt(val)).optional().default("100")
});

// Get weekly submissions with filtering
const getWeeklySubmissions = async (filters = {}) => {
  try {
    const { resourceId, status, startDate, endDate, department, limit } = filters;
    
    Logger.info('Fetching weekly submissions', filters);

    // Fetch resources for filtering and enrichment
    const resources = await DatabaseService.getResources();
    
    if (!resources || !Array.isArray(resources)) {
      Logger.warn('Invalid resources data received from database', { resourcesType: typeof resources });
      return [];
    }

    // Filter resources by department if specified
    let filteredResources = resources.filter(resource => resource.isActive);
    if (department && department !== 'all') {
      filteredResources = filteredResources.filter(resource => {
        const resourceDepartment = resource.department || resource.role || 'General';
        return resourceDepartment === department;
      });
    }

    // Filter by specific resource if specified
    if (resourceId) {
      const targetResourceId = parseInt(resourceId);
      filteredResources = filteredResources.filter(resource => resource.id === targetResourceId);
    }

    // Generate mock weekly submissions for the past 8 weeks
    const submissions = [];
    const currentDate = new Date();
    
    for (let weekOffset = 0; weekOffset < 8; weekOffset++) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - (currentDate.getDay() - 1) - (weekOffset * 7)); // Monday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      // Apply date range filter if specified
      if (startDate && weekStartStr < startDate) continue;
      if (endDate && weekStartStr > endDate) continue;
      
      // Create submissions for each resource
      filteredResources.forEach(resource => {
        // Mock submission probability - higher for past weeks
        const isPastWeek = weekEnd < currentDate;
        const hasSubmission = isPastWeek ? Math.random() > 0.2 : Math.random() > 0.6; // 80% for past, 40% for current/future
        
        if (hasSubmission) {
          const submissionStatus = isPastWeek ? 
            (Math.random() > 0.1 ? 'submitted' : 'approved') : // 90% submitted, 10% approved for past weeks
            'draft'; // Current/future weeks are drafts
          
          // Apply status filter
          if (status !== 'all' && submissionStatus !== status) return;
          
          const submission = {
            id: `${resource.id}-${weekStartStr}`,
            resourceId: resource.id,
            weekStartDate: weekStartStr,
            status: submissionStatus,
            submittedAt: submissionStatus === 'submitted' || submissionStatus === 'approved' ? 
              new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
            totalHours: 35 + Math.random() * 10, // 35-45 hours
            notes: `Week ${weekOffset + 1} submission`,
            resource: {
              id: resource.id,
              name: resource.name,
              email: resource.email,
              department: resource.department || resource.role || 'General',
              role: resource.role
            },
            createdAt: new Date(weekStart.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          submissions.push(submission);
        }
      });
    }

    // Sort by week start date (most recent first) and limit results
    submissions.sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate));
    const limitedSubmissions = submissions.slice(0, limit);

    Logger.info('Weekly submissions fetched successfully', {
      totalSubmissions: limitedSubmissions.length,
      filters,
      resourcesCount: filteredResources.length
    });

    return limitedSubmissions;
  } catch (error) {
    Logger.error('Failed to fetch weekly submissions', error, filters);
    throw error;
  }
};

// Main weekly submissions handler
const weeklySubmissionsHandler = async (req, res, { user, validatedData }) => {
  const { resourceId, status, startDate, endDate, department, limit } = validatedData;
  
  Logger.info('Fetching weekly submissions', {
    userId: user.id,
    resourceId,
    status,
    startDate,
    endDate,
    department,
    limit
  });
  
  try {
    const submissions = await getWeeklySubmissions({
      resourceId,
      status,
      startDate,
      endDate,
      department,
      limit
    });
    
    Logger.info('Weekly submissions fetched successfully', {
      userId: user.id,
      submissionsCount: submissions.length,
      filters: { resourceId, status, department }
    });
    
    return res.json(submissions);
    
  } catch (error) {
    Logger.error('Failed to fetch weekly submissions', error, { userId: user.id });
    return res.status(500).json({ message: 'Failed to fetch weekly submissions' });
  }
};

// Export with middleware - Demo mode: no authentication required
module.exports = withMiddleware(weeklySubmissionsHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: weeklySubmissionsQuerySchema
});
