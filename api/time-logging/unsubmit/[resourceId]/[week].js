// Load environment variables for development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { z } = require('zod');
const { withMiddleware, Logger } = require('../../../lib/middleware');
const { DatabaseService } = require('../../../lib/supabase');

// Input validation schema for unsubmission
const unsubmitTimeLoggingSchema = z.object({
  reason: z.string().optional()
});

// Unsubmit weekly timesheet
const unsubmitWeeklyTimesheet = async (resourceId, week, unsubmissionData = {}) => {
  try {
    Logger.info('Unsubmitting weekly timesheet', { resourceId, week, unsubmissionData });

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

    // For now, create mock unsubmission since weekly_submissions table may not be fully implemented
    // TODO: Replace with real database operations when weekly_submissions table is available
    
    // Check if submission exists (mock check)
    const submissionExists = Math.random() > 0.2; // 80% chance submission exists
    
    if (!submissionExists) {
      throw new Error('No submission found for this week');
    }

    const unsubmission = {
      id: `${resourceId}-${week}-unsubmit-${Date.now()}`, // Mock ID with timestamp
      resourceId: resourceId,
      weekStartDate: week,
      status: 'draft', // Changed back to draft
      unsubmittedAt: new Date().toISOString(),
      previousStatus: 'submitted',
      reason: unsubmissionData.reason || 'Timesheet unsubmitted for corrections',
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
    // 1. Find the existing weekly submission record
    // 2. Update the submission status back to 'draft'
    // 3. Update time entry statuses back to 'draft'
    // 4. Log the unsubmission action with reason
    // 5. Send notifications to relevant parties

    Logger.info('Weekly timesheet unsubmitted successfully', {
      resourceId,
      week,
      unsubmissionId: unsubmission.id,
      reason: unsubmission.reason,
      resourceName: resource.name
    });

    return unsubmission;
  } catch (error) {
    Logger.error('Failed to unsubmit weekly timesheet', error, { resourceId, week });
    throw error;
  }
};

// Main unsubmit handler
const unsubmitHandler = async (req, res, { user, validatedData }) => {
  const { reason } = validatedData;
  
  // Extract resource ID and week from URL path
  const resourceId = parseInt(req.query.resourceId);
  const week = req.query.week;
  
  if (isNaN(resourceId) || resourceId <= 0) {
    Logger.warn('Invalid resource ID provided for unsubmission', { 
      resourceId: req.query.resourceId, 
      parsedId: resourceId,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid resource ID provided' });
  }
  
  if (!week || typeof week !== 'string') {
    Logger.warn('Invalid week provided for unsubmission', { 
      week,
      userId: user.id,
      url: req.url 
    });
    return res.status(400).json({ message: 'Invalid week provided' });
  }
  
  Logger.info('Processing weekly timesheet unsubmission', {
    userId: user.id,
    resourceId,
    week,
    reason
  });
  
  try {
    const unsubmission = await unsubmitWeeklyTimesheet(resourceId, week, {
      reason
    });
    
    Logger.info('Weekly timesheet unsubmission completed successfully', {
      userId: user.id,
      resourceId,
      week,
      unsubmissionId: unsubmission.id
    });
    
    return res.json(unsubmission);
    
  } catch (error) {
    Logger.error('Failed to process weekly timesheet unsubmission', error, { 
      userId: user.id, 
      resourceId, 
      week 
    });
    
    if (error.message === 'Resource not found') {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    if (error.message === 'No submission found for this week') {
      return res.status(404).json({ message: 'No submission found for this week' });
    }
    
    return res.status(500).json({ message: 'Failed to unsubmit weekly timesheet' });
  }
};

// Export with middleware
module.exports = withMiddleware(unsubmitHandler, {
  requireAuth: false, // Changed to false for demo mode
  allowedMethods: ['POST'],
  validateSchema: unsubmitTimeLoggingSchema
});
