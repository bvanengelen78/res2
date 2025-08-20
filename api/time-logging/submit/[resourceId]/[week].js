// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../../../lib/middleware');
const { DatabaseService } = require('../../../lib/supabase');

// Input validation schema for submission
const submitTimeLoggingSchema = z.object({
  notes: z.string().optional(),
  totalHours: z.number().optional()
});

// Submit weekly timesheet
const submitWeeklyTimesheet = async (resourceId, week, submissionData = {}) => {
  try {
    Logger.info('Submitting weekly timesheet', { resourceId, week, submissionData });

    // Parse the week parameter (expected format: "2025-08-18" - Monday of the week)
    const weekStartDate = new Date(week);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    // Verify the resource exists
    const resources = await DatabaseService.getResources();
    const resource = resources.find(r => r.id === resourceId);
    
    if (!resource) {
      throw new Error('Resource not found');
    }

    // For now, create mock submission since weekly_submissions table may not be fully implemented
    // TODO: Replace with real database operations when weekly_submissions table is available
    
    const submission = {
      id: `${resourceId}-${week}-${Date.now()}`, // Mock ID with timestamp
      resourceId: resourceId,
      weekStartDate: week,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      totalHours: submissionData.totalHours || 40,
      notes: submissionData.notes || 'Weekly timesheet submitted',
      resource: {
        id: resource.id,
        name: resource.name,
        email: resource.email,
        department: resource.department || resource.role || 'General'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real implementation, this would:
    // 1. Validate that all required time entries are present
    // 2. Calculate total hours from time entries
    // 3. Create or update the weekly submission record
    // 4. Update time entry statuses to 'submitted'
    // 5. Send notifications to managers/admins

    Logger.info('Weekly timesheet submitted successfully', {
      resourceId,
      week,
      submissionId: submission.id,
      totalHours: submission.totalHours,
      resourceName: resource.name
    });

    return submission;
  } catch (error) {
    Logger.error('Failed to submit weekly timesheet', error, { resourceId, week });
    throw error;
  }
};

// Main submit handler
const submitHandler = async (req, res, { user, validatedData }) => {
  const { notes, totalHours } = validatedData;
  
  // Extract resource ID and week from URL path
  const resourceId = parseInt(req.query.resourceId);
  const week = req.query.week;
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided for submission', { 
      resourceId: req.query.resourceId, 
      parsedId: resourceId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }
  
  if (!week || typeof week !== 'string') {
    Logger.warn('Invalid week provided for submission', { 
      week,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid week provided' });
  }
  
  Logger.info('Processing weekly timesheet submission', {
    userId: user.id,
    resourceId,
    week,
    notes,
    totalHours
  });
  
  try {
    const submission = await submitWeeklyTimesheet(resourceId, week, {
      notes,
      totalHours
    });
    
    Logger.info('Weekly timesheet submission completed successfully', {
      userId: user.id,
      resourceId,
      week,
      submissionId: submission.id
    });
    
    return res.status(201).json(submission);
    
  } catch (error) {
    Logger.error('Failed to process weekly timesheet submission', error, { 
      userId: user.id, 
      resourceId, 
      week 
    });
    
    if (error.message === 'Resource not found') {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    return res.status(500).json({ message: 'Failed to submit weekly timesheet' });
  }
};

// Export with middleware
module.exports = withMiddleware(submitHandler, {
  requireAuth: true,
  allowedMethods: ['POST'],
  validateSchema: submitTimeLoggingSchema
});
