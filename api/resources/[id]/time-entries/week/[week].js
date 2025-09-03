// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../../../../lib/middleware');
const { DatabaseService } = require('../../../../lib/supabase');

// Input validation schema for weekly time entries query
const weeklyTimeEntriesQuerySchema = z.object({
  includeAllocations: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(true)
});

// Get weekly time entries for a resource
const getWeeklyTimeEntries = async (resourceId, week, includeAllocations = true) => {
  try {
    Logger.info('Fetching weekly time entries', { resourceId, week, includeAllocations });

    // Parse the week parameter (expected format: "2025-08-18" - Monday of the week)
    const weekStartDate = new Date(week);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    // For now, return mock time entries data since time_entries table may not be fully implemented
    // TODO: Replace with real database queries when time_entries table is available
    
    if (includeAllocations) {
      // Fetch allocations to create realistic time entries
      const [allocations, projects] = await Promise.all([
        DatabaseService.getResourceAllocations(),
        DatabaseService.getProjects()
      ]);

      if (!allocations || !Array.isArray(allocations)) {
        Logger.warn('Invalid allocations data received from database', { resourceId, allocationsType: typeof allocations });
        return [];
      }

      // Filter allocations for this resource that overlap with the week
      const resourceAllocations = allocations.filter(allocation => {
        if (allocation.resourceId !== resourceId) return false;
        
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        
        // Check if allocation overlaps with the week
        return allocationStart <= weekEndDate && allocationEnd >= weekStartDate;
      });

      // Create time entries based on allocations
      const timeEntries = resourceAllocations.map((allocation, index) => {
        const project = projects?.find(p => p.id === allocation.projectId);
        
        // Get weekly allocation hours for this specific week
        const year = weekStartDate.getFullYear();
        const weekNumber = getWeekNumber(weekStartDate);
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        const weeklyHours = allocation.weeklyAllocations?.[weekKey] || 0;
        
        // Distribute hours across weekdays (mock data)
        const dailyHours = distributeHoursAcrossWeek(weeklyHours);
        
        return {
          id: `${allocation.id}-${week}`, // Mock ID
          resourceId: allocation.resourceId,
          allocationId: allocation.id,
          projectId: allocation.projectId,
          weekStartDate: week,
          mondayHours: dailyHours.monday.toString(),
          tuesdayHours: dailyHours.tuesday.toString(),
          wednesdayHours: dailyHours.wednesday.toString(),
          thursdayHours: dailyHours.thursday.toString(),
          fridayHours: dailyHours.friday.toString(),
          saturdayHours: dailyHours.saturday.toString(),
          sundayHours: dailyHours.sunday.toString(),
          status: 'draft',
          allocation: {
            ...allocation,
            project: project ? {
              id: project.id,
              name: project.name,
              status: project.status,
              department: project.department
            } : null
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      Logger.info('Weekly time entries with allocations fetched successfully', {
        resourceId,
        week,
        entriesCount: timeEntries.length,
        allocationsCount: resourceAllocations.length
      });

      return timeEntries;
    } else {
      // Return basic time entries without allocation details
      const mockTimeEntries = [
        {
          id: `${resourceId}-${week}-1`,
          resourceId: resourceId,
          weekStartDate: week,
          mondayHours: "8.0",
          tuesdayHours: "8.0",
          wednesdayHours: "8.0",
          thursdayHours: "8.0",
          fridayHours: "8.0",
          saturdayHours: "0.0",
          sundayHours: "0.0",
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      Logger.info('Weekly time entries fetched successfully', {
        resourceId,
        week,
        entriesCount: mockTimeEntries.length
      });

      return mockTimeEntries;
    }
  } catch (error) {
    Logger.error('Failed to fetch weekly time entries', error, { resourceId, week });
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

// Helper function to distribute hours across weekdays
const distributeHoursAcrossWeek = (totalHours) => {
  if (totalHours <= 0) {
    return {
      monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0
    };
  }

  // Distribute hours primarily across weekdays
  const dailyHours = totalHours / 5; // Assume 5-day work week
  
  return {
    monday: Math.round(dailyHours * 10) / 10,
    tuesday: Math.round(dailyHours * 10) / 10,
    wednesday: Math.round(dailyHours * 10) / 10,
    thursday: Math.round(dailyHours * 10) / 10,
    friday: Math.round(dailyHours * 10) / 10,
    saturday: 0,
    sunday: 0
  };
};

// Main weekly time entries handler
const weeklyTimeEntriesHandler = async (req, res, { user, validatedData }) => {
  const { includeAllocations } = validatedData;
  
  // Extract resource ID and week from URL path
  const resourceId = parseInt(req.query.id);
  const week = req.query.week;
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided for weekly time entries', { 
      resourceId: req.query.id, 
      parsedId: resourceId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }
  
  if (!week || typeof week !== 'string') {
    Logger.warn('Invalid week provided for weekly time entries', { 
      week,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid week provided' });
  }
  
  Logger.info('Fetching weekly time entries', {
    userId: user.id,
    resourceId,
    week,
    includeAllocations
  });
  
  try {
    // First verify the resource exists
    const resources = await DatabaseService.getResources();
    const resource = resources.find(r => r.id === resourceId);
    
    if (!resource) {
      Logger.warn('Resource not found for weekly time entries query', { resourceId, userId: user.id });
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    const timeEntries = await getWeeklyTimeEntries(resourceId, week, includeAllocations);
    
    Logger.info('Weekly time entries fetched successfully', {
      userId: user.id,
      resourceId,
      week,
      entriesCount: timeEntries.length
    });
    
    return res.json(timeEntries);
    
  } catch (error) {
    Logger.error('Failed to fetch weekly time entries', error, { userId: user.id, resourceId, week });
    return res.status(500).json({ message: 'Failed to fetch weekly time entries' });
  }
};

// Export with middleware
module.exports = withMiddleware(weeklyTimeEntriesHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: weeklyTimeEntriesQuerySchema
});
