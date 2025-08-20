// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../../../../lib/middleware');
const { DatabaseService } = require('../../../../lib/supabase');

// Input validation schema for weekly submission query
const weeklySubmissionQuerySchema = z.object({
  includeDetails: z.union([
    z.string().transform(val => val === 'true'),
    z.boolean()
  ]).optional().default(true)
});

// Get weekly submission for a resource
const getWeeklySubmission = async (resourceId, week, includeDetails = true) => {
  try {
    Logger.info('Fetching weekly submission', { resourceId, week, includeDetails });

    // Parse the week parameter (expected format: "2025-08-18" - Monday of the week)
    const weekStartDate = new Date(week);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    // For now, return mock submission data since weekly_submissions table may not be fully implemented
    // TODO: Replace with real database queries when weekly_submissions table is available
    
    // Check if this week has been submitted (mock logic)
    const isCurrentWeek = isCurrentWeekCheck(weekStartDate);
    const isPastWeek = weekStartDate < new Date();
    
    // Mock submission status - 70% chance of submission for past weeks, 30% for current week
    const hasSubmission = isPastWeek ? Math.random() > 0.3 : Math.random() > 0.7;
    
    if (!hasSubmission) {
      // No submission found
      return null;
    }

    // Create mock submission data
    const submission = {
      id: `${resourceId}-${week}`, // Mock ID
      resourceId: resourceId,
      weekStartDate: week,
      status: isPastWeek ? 'submitted' : 'draft',
      submittedAt: isPastWeek ? new Date(weekEndDate.getTime() + 24 * 60 * 60 * 1000).toISOString() : null, // Day after week end
      totalHours: 40, // Mock total hours
      notes: isPastWeek ? 'Week completed successfully' : 'Work in progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (includeDetails) {
      // Add additional details like time entries summary
      submission.timeEntriesSummary = {
        mondayHours: 8,
        tuesdayHours: 8,
        wednesdayHours: 8,
        thursdayHours: 8,
        fridayHours: 8,
        saturdayHours: 0,
        sundayHours: 0,
        totalHours: 40
      };
      
      submission.projectBreakdown = [
        {
          projectId: 1,
          projectName: 'Project Alpha',
          hours: 24
        },
        {
          projectId: 2,
          projectName: 'Project Beta',
          hours: 16
        }
      ];
    }

    Logger.info('Weekly submission fetched successfully', {
      resourceId,
      week,
      submissionId: submission.id,
      status: submission.status,
      hasDetails: includeDetails
    });

    return submission;
  } catch (error) {
    Logger.error('Failed to fetch weekly submission', error, { resourceId, week });
    throw error;
  }
};

// Helper function to check if a date is in the current week
const isCurrentWeekCheck = (date) => {
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday
  currentWeekEnd.setHours(23, 59, 59, 999);
  
  return date >= currentWeekStart && date <= currentWeekEnd;
};

// Main weekly submission handler
const weeklySubmissionHandler = async (req, res, { user, validatedData }) => {
  const { includeDetails } = validatedData;
  
  // Extract resource ID and week from URL path
  const resourceId = parseInt(req.query.id);
  const week = req.query.week;
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided for weekly submission', { 
      resourceId: req.query.id, 
      parsedId: resourceId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }
  
  if (!week || typeof week !== 'string') {
    Logger.warn('Invalid week provided for weekly submission', { 
      week,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid week provided' });
  }
  
  Logger.info('Fetching weekly submission', {
    userId: user.id,
    resourceId,
    week,
    includeDetails
  });
  
  try {
    // First verify the resource exists
    const resources = await DatabaseService.getResources();
    const resource = resources.find(r => r.id === resourceId);
    
    if (!resource) {
      Logger.warn('Resource not found for weekly submission query', { resourceId, userId: user.id });
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    const submission = await getWeeklySubmission(resourceId, week, includeDetails);
    
    if (!submission) {
      Logger.info('No weekly submission found', {
        userId: user.id,
        resourceId,
        week
      });
      return res.status(404).json({ message: 'Weekly submission not found' });
    }
    
    Logger.info('Weekly submission fetched successfully', {
      userId: user.id,
      resourceId,
      week,
      submissionId: submission.id,
      status: submission.status
    });
    
    return res.json(submission);
    
  } catch (error) {
    Logger.error('Failed to fetch weekly submission', error, { userId: user.id, resourceId, week });
    return res.status(500).json({ message: 'Failed to fetch weekly submission' });
  }
};

// Export with middleware
module.exports = withMiddleware(weeklySubmissionHandler, {
  requireAuth: true,
  allowedMethods: ['GET'],
  validateSchema: weeklySubmissionQuerySchema
});
