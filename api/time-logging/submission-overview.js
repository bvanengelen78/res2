// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../lib/middleware');
const { DatabaseService } = require('../lib/supabase');

// Input validation schema for submission overview query
const submissionOverviewQuerySchema = z.object({
  week: z.string().min(1, 'Week parameter is required'),
  department: z.string().optional()
});

// Calculate submission overview data
const calculateSubmissionOverview = async (week, department = null) => {
  try {
    Logger.info('Calculating submission overview', { week, department });

    // Fetch all required data
    const [resources, allocations, projects] = await Promise.all([
      DatabaseService.getResources(),
      DatabaseService.getResourceAllocations(),
      DatabaseService.getProjects()
    ]);

    if (!resources || !Array.isArray(resources)) {
      Logger.warn('Invalid resources data received from database', { resourcesType: typeof resources });
      return [];
    }

    if (!allocations || !Array.isArray(allocations)) {
      Logger.warn('Invalid allocations data received from database', { allocationsType: typeof allocations });
      return [];
    }

    if (!projects || !Array.isArray(projects)) {
      Logger.warn('Invalid projects data received from database', { projectsType: typeof projects });
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

    // Parse the week parameter (expected format: "2025-W34" or similar)
    const weekMatch = week.match(/(\d{4})-W(\d{1,2})/);
    if (!weekMatch) {
      throw new Error(`Invalid week format: ${week}. Expected format: YYYY-WNN`);
    }

    const year = parseInt(weekMatch[1]);
    const weekNumber = parseInt(weekMatch[2]);

    // Calculate week start and end dates
    const weekStartDate = getWeekStartDate(year, weekNumber);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    Logger.info('Processing submission overview for week', {
      week,
      weekStartDate: weekStartDate.toISOString(),
      weekEndDate: weekEndDate.toISOString(),
      resourcesCount: filteredResources.length
    });

    // Create submission overview for each resource
    const submissionOverview = filteredResources.map(resource => {
      // Find allocations for this resource that overlap with the week
      const resourceAllocations = allocations.filter(allocation => {
        if (allocation.resourceId !== resource.id) return false;
        
        const allocationStart = new Date(allocation.startDate);
        const allocationEnd = new Date(allocation.endDate);
        
        // Check if allocation overlaps with the week
        return allocationStart <= weekEndDate && allocationEnd >= weekStartDate;
      });

      // Enrich allocations with project information
      const enrichedAllocations = resourceAllocations.map(allocation => {
        const project = projects.find(p => p.id === allocation.projectId);
        return {
          ...allocation,
          project: project ? {
            id: project.id,
            name: project.name,
            status: project.status,
            department: project.department
          } : null
        };
      });

      // Calculate submission status (mock data for now - would be based on actual time entries)
      const hasSubmission = Math.random() > 0.3; // 70% chance of submission for demo
      const submissionStatus = hasSubmission ? 'submitted' : 'pending';
      
      // Calculate total allocated hours for the week
      const totalAllocatedHours = enrichedAllocations.reduce((sum, allocation) => {
        // Get weekly allocation for this specific week if available
        const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        const weeklyHours = allocation.weeklyAllocations?.[weekKey] || 0;
        return sum + weeklyHours;
      }, 0);

      return {
        resource: {
          id: resource.id,
          name: resource.name,
          email: resource.email,
          department: resource.department || resource.role || 'General',
          role: resource.role,
          weeklyCapacity: resource.weeklyCapacity || 40
        },
        week,
        submissionStatus,
        allocations: enrichedAllocations,
        totalAllocatedHours,
        submittedHours: hasSubmission ? totalAllocatedHours * (0.8 + Math.random() * 0.4) : 0, // Mock submitted hours
        submissionDate: hasSubmission ? new Date().toISOString() : null,
        isOverdue: !hasSubmission && new Date() > weekEndDate
      };
    });

    Logger.info('Submission overview calculated successfully', {
      week,
      department,
      resourcesCount: submissionOverview.length,
      submittedCount: submissionOverview.filter(s => s.submissionStatus === 'submitted').length,
      pendingCount: submissionOverview.filter(s => s.submissionStatus === 'pending').length
    });

    return submissionOverview;
  } catch (error) {
    Logger.error('Failed to calculate submission overview', error, { week, department });
    throw error;
  }
};

// Helper function to get week start date from year and week number
const getWeekStartDate = (year, weekNumber) => {
  // January 4th is always in the first week of the year
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Sunday = 7
  
  // Calculate the start of the first week (Monday)
  const firstWeekStart = new Date(jan4);
  firstWeekStart.setDate(jan4.getDate() - jan4Day + 1);
  
  // Calculate the start of the target week
  const targetWeekStart = new Date(firstWeekStart);
  targetWeekStart.setDate(firstWeekStart.getDate() + (weekNumber - 1) * 7);
  
  return targetWeekStart;
};

// Main submission overview handler
const submissionOverviewHandler = async (req, res, { user, validatedData }) => {
  const { week, department } = validatedData;
  
  Logger.info('Fetching submission overview', {
    userId: user.id,
    week,
    department
  });
  
  try {
    const submissionOverview = await calculateSubmissionOverview(week, department);
    
    Logger.info('Submission overview fetched successfully', {
      userId: user.id,
      week,
      department,
      resourcesCount: submissionOverview.length
    });
    
    return res.json(submissionOverview);
    
  } catch (error) {
    Logger.error('Failed to fetch submission overview', error, { userId: user.id, week, department });
    return res.status(500).json({ message: 'Failed to fetch submission overview' });
  }
};

// Export with middleware
module.exports = withMiddleware(submissionOverviewHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['GET'],
  validateSchema: submissionOverviewQuerySchema
});
