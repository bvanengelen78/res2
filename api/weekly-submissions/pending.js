// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema for pending submissions query
const pendingSubmissionsQuerySchema = z.object({
  department: z.string().optional(),
  weeksBack: z.string().transform(val => parseInt(val)).optional().default("4"),
  limit: z.string().transform(val => parseInt(val)).optional().default("100")
});

// Get pending weekly submissions
const getPendingSubmissions = async (filters = {}) => {
  try {
    const { department, weeksBack, limit } = filters;
    
    Logger.info('Fetching pending weekly submissions', filters);

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

    // Generate pending submissions for the specified number of weeks back
    const pendingSubmissions = [];
    const currentDate = new Date();
    
    for (let weekOffset = 0; weekOffset < weeksBack; weekOffset++) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - (currentDate.getDay() - 1) - (weekOffset * 7)); // Monday
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      // Only consider weeks that have ended (past weeks)
      if (weekEnd >= currentDate) continue;
      
      // Create pending submissions for resources that haven't submitted
      filteredResources.forEach(resource => {
        // Mock logic: 30% chance of missing submission for past weeks
        const hasMissingSubmission = Math.random() > 0.7;
        
        if (hasMissingSubmission) {
          const daysSinceWeekEnd = Math.floor((currentDate - weekEnd) / (1000 * 60 * 60 * 24));
          const isOverdue = daysSinceWeekEnd > 2; // Overdue if more than 2 days past week end
          
          const pendingSubmission = {
            id: `pending-${resource.id}-${weekStartStr}`,
            resourceId: resource.id,
            weekStartDate: weekStartStr,
            weekEndDate: weekEnd.toISOString().split('T')[0],
            status: 'pending',
            daysOverdue: Math.max(0, daysSinceWeekEnd - 2), // Grace period of 2 days
            isOverdue: isOverdue,
            priority: isOverdue ? (daysSinceWeekEnd > 7 ? 'high' : 'medium') : 'low',
            expectedHours: 40, // Expected weekly hours
            resource: {
              id: resource.id,
              name: resource.name,
              email: resource.email,
              department: resource.department || resource.role || 'General',
              role: resource.role,
              weeklyCapacity: resource.weeklyCapacity || 40
            },
            weekInfo: {
              weekNumber: getWeekNumber(weekStart),
              year: weekStart.getFullYear(),
              weekStartDate: weekStartStr,
              weekEndDate: weekEnd.toISOString().split('T')[0]
            },
            createdAt: new Date(weekStart.getTime() - 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          pendingSubmissions.push(pendingSubmission);
        }
      });
    }

    // Sort by priority (high first), then by days overdue (most overdue first)
    pendingSubmissions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.daysOverdue - a.daysOverdue;
    });

    // Limit results
    const limitedSubmissions = pendingSubmissions.slice(0, limit);

    Logger.info('Pending weekly submissions fetched successfully', {
      totalPending: limitedSubmissions.length,
      overdueCount: limitedSubmissions.filter(s => s.isOverdue).length,
      highPriorityCount: limitedSubmissions.filter(s => s.priority === 'high').length,
      filters,
      resourcesCount: filteredResources.length
    });

    return limitedSubmissions;
  } catch (error) {
    Logger.error('Failed to fetch pending weekly submissions', error, filters);
    throw error;
  }
};

// Helper function to get ISO week number
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Main pending submissions handler
const pendingSubmissionsHandler = async (req, res, { user, validatedData }) => {
  const { department, weeksBack, limit } = validatedData;
  
  Logger.info('Fetching pending weekly submissions', {
    userId: user.id,
    department,
    weeksBack,
    limit
  });
  
  try {
    const pendingSubmissions = await getPendingSubmissions({
      department,
      weeksBack,
      limit
    });
    
    Logger.info('Pending weekly submissions fetched successfully', {
      userId: user.id,
      pendingCount: pendingSubmissions.length,
      overdueCount: pendingSubmissions.filter(s => s.isOverdue).length,
      filters: { department, weeksBack }
    });
    
    return res.json(pendingSubmissions);
    
  } catch (error) {
    Logger.error('Failed to fetch pending weekly submissions', error, { userId: user.id });
    return res.status(500).json({ message: 'Failed to fetch pending weekly submissions' });
  }
};

// Export with middleware
module.exports = withMiddleware(pendingSubmissionsHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: pendingSubmissionsQuerySchema
});
